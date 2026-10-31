using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services;

public sealed record HotelPricingRowInput(Species Species, SizeGroup SizeGroup, decimal PricePerNight, decimal FoodPerNight);

public sealed record HotelPricingInput(IReadOnlyList<HotelPricingRowInput> Pricing, decimal LateFeePerBlock);