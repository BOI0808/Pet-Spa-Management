using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Payments;

public sealed class PaymentAmountService(
    IPaymentAmountRepository repository,
    IHotelCatalogRepository hotelCatalog,
    IStoreTimeZoneProvider timeZoneProvider)
{
    public async Task<decimal> DetermineSpaAmountAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var spa = await repository.GetSpaAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (spa.Status != AppointmentStatus.Completed)
        {
            throw new BusinessException(ErrorCodes.PaymentNotDue);
        }

        return PricingService.CalculateSpaAmount(spa.Species, spa.SizeGroup, spa.ServiceIds, spa.Pricing);
    }

    public async Task<decimal> DetermineStayAmountAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var stay = await repository.GetStayAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (stay.Status != AppointmentStatus.Confirmed)
        {
            throw new BusinessException(ErrorCodes.PaymentNotDue);
        }

        var hotelPricing = await hotelCatalog.GetPricingAsync(ct);
        var nights = PricingService.CountNights(
            stay.PlannedCheckIn, stay.PlannedCheckOut, timeZoneProvider.GetStoreTimeZone());

        return PricingService.CalculateStayAmount(nights, stay.Species, stay.SizeGroup, hotelPricing.Pricing);
    }

    public async Task<decimal> DetermineLateFeeAsync(
        Guid appointmentId, DateTimeOffset? returnedAt = null, CancellationToken ct = default)
    {
        var stay = await repository.GetStayAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (stay.Status != AppointmentStatus.InStay)
        {
            throw new BusinessException(ErrorCodes.PaymentNotDue);
        }

        var effectiveReturnedAt = stay.ActualCheckOut ?? returnedAt ?? DateTimeOffset.UtcNow;
        var config = await repository.GetLateFeeConfigAsync(ct);

        return PricingService.CalculateLateFee(
            stay.PlannedCheckOut,
            effectiveReturnedAt,
            config.GraceMinutes,
            config.BlockMinutes,
            config.FeePerBlock);
    }
}
