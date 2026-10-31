using PetSpa.Application.Services;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record HotelPricingRowRequest(Species? Species, SizeGroup? SizeGroup, long? PricePerNight, long? FoodPerNight);

public sealed record HotelPricingRequest(IReadOnlyList<HotelPricingRowRequest> Pricing, long? LateFeePerBlock)
{
    public HotelPricingInput ToInput() => new(
        Pricing.Select(p => new HotelPricingRowInput(
            p.Species!.Value,
            p.SizeGroup!.Value,
            p.PricePerNight!.Value,
            p.FoodPerNight!.Value)).ToList(),
        LateFeePerBlock!.Value);
}