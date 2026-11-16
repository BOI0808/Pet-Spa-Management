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
    ICostConfirmationRepository costConfirmations,
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
            try
            {
                newAmount = PricingService.CalculateSpaAmount(
                    snapshot.Species, comparison.NewSizeGroup, snapshot.ServiceIds, newPricing);
            }
            catch (InvalidOperationException)
            {
                throw new BusinessException(
                    ErrorCodes.ValidationError, "Có dịch vụ không áp dụng cho nhóm kích cỡ mới của thú cưng.");
            }
        }

        var outcome = Apply(appointment, context, actualWeightKg, oldAmount, newAmount);

        return outcome.Result == WeightCheckResult.NEEDS_CONFIRMATION
            ? await CreateConfirmationAsync(appointment.AppointmentId, actualWeightKg, outcome, ct)
            : outcome;
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

            if (await costConfirmations.HasPendingAsync(appointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

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

            var outcome = Apply(hotelStay, context, actualWeightKg, oldAmount, newAmount);

            if (outcome.Result == WeightCheckResult.NEEDS_CONFIRMATION)
                return await CreateConfirmationAsync(appointmentId, actualWeightKg, outcome, ct);

            if (outcome.Result == WeightCheckResult.PRICE_DECREASED)
            {
                var cageSuitable = await IsCageSuitableAsync(hotelStay, found.Species, ct);
                return outcome with { CageSuitable = cageSuitable };
            }

            return outcome;
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

    private async Task<WeightCheckOutcome> CreateConfirmationAsync(
        Guid appointmentId, decimal actualWeightKg, WeightCheckOutcome outcome, CancellationToken ct)
    {
        var timeoutMinutes = await costConfirmations.GetTimeoutMinutesAsync(ct);
        var now = DateTimeOffset.UtcNow;

        var confirmation = new CostConfirmation
        {
            ConfirmationId = Guid.NewGuid(),
            AppointmentId = appointmentId,
            ActualWeightKg = actualWeightKg,
            NewSizeGroup = outcome.NewSizeGroup!.Value,
            OldAmount = outcome.OldAmount!.Value,
            NewAmount = outcome.NewAmount!.Value,
            Status = ConfirmationStatus.Pending,
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(timeoutMinutes),
        };

        costConfirmations.Add(confirmation);

        return outcome with { ExpiresAt = confirmation.ExpiresAt };
    }

    private async Task<bool> IsCageSuitableAsync(HotelAppointment stay, Species species, CancellationToken ct)
    {
        var cage = stay.CageId is { } cageId ? await hotelAssignments.FindCageAsync(cageId, ct) : null;
        return stay.IsCageSuitable(cage, species);
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