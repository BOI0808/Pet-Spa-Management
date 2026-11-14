using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed class WeightCheckService(
    IPetRepository pets,
    IPaymentAmountRepository paymentAmounts,
    IBookingRepository bookings,
    IHotelAssignmentRepository hotelAssignments,
    IHotelCatalogRepository hotelCatalog,
    IStoreTimeZoneProvider timeZoneProvider,
    IConcurrencyGuard concurrencyGuard)
{
    public async Task<WeightCheckOutcome> RecordForSpaAsync(
        SpaAppointment appointment, decimal actualWeightKg, CancellationToken ct = default)
    {
        var context = await CompareAsync(appointment.PetId, appointment.SizeGroup, actualWeightKg, ct);
        var comparison = context.Comparison;

        decimal? oldAmount = null;
        decimal? newAmount = null;

        if (comparison.Result != WeightCheckResult.OK)
        {
            var snapshot = await paymentAmounts.GetSpaAsync(appointment.AppointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var newPricing = await bookings.ListPricingAsync(
                snapshot.ServiceIds, snapshot.Species, comparison.NewSizeGroup, ct);

            oldAmount = PricingService.CalculateSpaAmount(
                snapshot.Species, appointment.SizeGroup, snapshot.ServiceIds, snapshot.Pricing);
            newAmount = PricingService.CalculateSpaAmount(
                snapshot.Species, comparison.NewSizeGroup, snapshot.ServiceIds, newPricing);
        }

        return Apply(appointment, context, actualWeightKg, oldAmount, newAmount);
    }

    public async Task<WeightCheckOutcome> CheckHotelAsync(
        Guid appointmentId, decimal actualWeightKg, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await hotelAssignments.FindAppointmentAsync(appointmentId, asNoTracking: true, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (appointment is not HotelAppointment stay || stay.Status != AppointmentStatus.Confirmed)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var found = await hotelAssignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var hotelStay = found.Appointment;
            var context = await CompareAsync(hotelStay.PetId, hotelStay.SizeGroup, actualWeightKg, ct);
            var comparison = context.Comparison;

            decimal? oldAmount = null;
            decimal? newAmount = null;

            if (comparison.Result != WeightCheckResult.OK)
            {
                var hotelPricing = await hotelCatalog.GetPricingAsync(ct);
                var nights = PricingService.CountNights(
                    hotelStay.PlannedCheckIn, hotelStay.PlannedCheckOut, timeZoneProvider.GetStoreTimeZone());

                oldAmount = PricingService.CalculateStayAmount(nights, found.Species, hotelStay.SizeGroup, hotelPricing.Pricing);
                newAmount = PricingService.CalculateStayAmount(nights, found.Species, comparison.NewSizeGroup, hotelPricing.Pricing);
            }

            return Apply(hotelStay, context, actualWeightKg, oldAmount, newAmount);
        }, ct);
    }

    private async Task<WeightCheckContext> CompareAsync(
        Guid petId, SizeGroup currentGroup, decimal actualWeightKg, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(petId, asNoTracking: false, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var pet = found.Pet;

        var sizeRules = await pets.GetSizeRulesAsync(pet.Species, ct);
        var tolerances = await pets.GetWeightTolerancesAsync(pet.Species, ct);

        var comparison = WeightComparisonService.Compare(pet, currentGroup, actualWeightKg, sizeRules, tolerances);
        return new WeightCheckContext(pet, sizeRules, comparison);
    }

    private static WeightCheckOutcome Apply(
        Appointment appointment, WeightCheckContext context, decimal actualWeightKg, decimal? oldAmount, decimal? newAmount)
    {
        var comparison = context.Comparison;

        // Lưu ý: Đối với lịch lưu trú, việc kiểm tra và gán lại chuồng phù hợp (CageId)
        // khi đổi nhóm kích cỡ (cả PRICE_DECREASED và NEEDS_CONFIRMATION) được thực hiện tại Task 82 và Task 88 (BR-23).
        appointment.RecordWeight(
            actualWeightKg,
            comparison.Result == WeightCheckResult.PRICE_DECREASED ? comparison.NewSizeGroup : null);

        if (comparison.Result != WeightCheckResult.NEEDS_CONFIRMATION)
        {
            context.Pet.WeightKg = actualWeightKg;
            context.Pet.DetermineSizeGroup(context.SizeRules);
        }

        return comparison.Result == WeightCheckResult.OK
            ? new WeightCheckOutcome(WeightCheckResult.OK, null, null, null)
            : new WeightCheckOutcome(comparison.Result, comparison.NewSizeGroup, oldAmount, newAmount);
    }

    private sealed record WeightCheckContext(Pet Pet, IReadOnlyList<SizeRule> SizeRules, WeightComparison Comparison);
}