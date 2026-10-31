using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record HotelPricingSnapshot(IReadOnlyList<HotelPricing> Pricing, decimal LateFeePerBlock);

public interface IHotelCatalogRepository
{
    Task AddCageAsync(Cage cage, CancellationToken ct = default);
    Task<bool> UpdateCageAsync(Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default);
    Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default);
    Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default);
    Task SavePricingAsync(IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default);
}