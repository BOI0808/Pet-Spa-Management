using PetSpa.Application.Ports;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Payments;

public sealed class PaymentAmountService(IPaymentAmountRepository repository, IHotelCatalogRepository hotelCatalog)
{
    public async Task<decimal> DetermineSpaAmountAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var spa = await repository.GetSpaAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        return PricingService.CalculateSpaAmount(spa.Species, spa.SizeGroup, spa.ServiceIds, spa.Pricing);
    }

    public async Task<decimal> DetermineStayAmountAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var stay = await repository.GetStayAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        var hotelPricing = await hotelCatalog.GetPricingAsync(ct);
        var nights = PricingService.CountNights(
            stay.PlannedCheckIn, stay.PlannedCheckOut, repository.GetStoreTimeZone());

        return PricingService.CalculateStayAmount(nights, stay.Species, stay.SizeGroup, hotelPricing.Pricing);
    }

    public async Task<decimal> DetermineLateFeeAsync(
        Guid appointmentId, DateTimeOffset returnedAt, CancellationToken ct = default)
    {
        var stay = await repository.GetStayAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        var rules = await repository.GetLateFeeRulesAsync(ct);
        var hotelPricing = await hotelCatalog.GetPricingAsync(ct);

        return PricingService.CalculateLateFee(
            stay.PlannedCheckOut, returnedAt, rules.GraceMinutes, rules.BlockMinutes, hotelPricing.LateFeePerBlock);
    }
}