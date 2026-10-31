using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services;

public sealed class HotelCatalogService(IHotelCatalogRepository repository)
{
    public async Task<Guid> CreateCageAsync(CageInput input, CancellationToken ct = default)
    {
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = input.Code.Trim(),
            Species = input.Species,
            SizeGroup = input.SizeGroup,
        };

        await repository.AddCageAsync(cage, ct);
        return cage.CageId;
    }

    public async Task UpdateCageAsync(Guid cageId, CageUpdateInput input, CancellationToken ct = default)
    {
        var updated = await repository.UpdateCageAsync(cageId, input.Code?.Trim(), input.Species, input.SizeGroup, ct);
        if (!updated) throw new BusinessException(ErrorCodes.NotFound);
    }

    public async Task SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default)
    {
        if (!await repository.SetCageActiveAsync(cageId, isActive, ct))
            throw new BusinessException(ErrorCodes.NotFound);
    }

    public Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default) =>
        repository.GetPricingAsync(ct);

    public async Task SavePricingAsync(HotelPricingInput input, CancellationToken ct = default)
    {
        await EnsureValidPricingAsync(input, ct);

        var rows = input.Pricing.Select(p => new HotelPricing
        {
            Species = p.Species,
            SizeGroup = p.SizeGroup,
            PricePerNight = p.PricePerNight,
            FoodPerNight = p.FoodPerNight,
        }).ToList();

        await repository.SavePricingAsync(rows, input.LateFeePerBlock, ct);
    }

    private async Task EnsureValidPricingAsync(HotelPricingInput input, CancellationToken ct)
    {
        var duplicated = input.Pricing
            .GroupBy(p => new { p.Species, p.SizeGroup })
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicated is not null)
            throw new BusinessException(
                ErrorCodes.ValidationError,
                $"Giá lưu trú của loài {duplicated.Key.Species}, nhóm kích cỡ {duplicated.Key.SizeGroup} bị khai báo trùng.");

        var sizeRules = await repository.GetSizeRulesAsync(ct);
        foreach (var row in input.Pricing)
        {
            if (!GetSizeGroups(sizeRules, row.Species).Contains(row.SizeGroup))
                throw new BusinessException(
                    ErrorCodes.ValidationError,
                    $"Loài {row.Species} không có nhóm kích cỡ {row.SizeGroup}.");
        }
    }

    private static List<SizeGroup> GetSizeGroups(IReadOnlyList<SizeRule> sizeRules, Species species)
    {
        var rulesOfSpecies = sizeRules.Where(r => r.Species == species).ToList();
        if (rulesOfSpecies.Count == 0) return new List<SizeGroup>();

        return rulesOfSpecies.Any(r => r.MediumUpper is null)
            ? new List<SizeGroup> { SizeGroup.Small, SizeGroup.Large }
            : new List<SizeGroup> { SizeGroup.Small, SizeGroup.Medium, SizeGroup.Large };
    }
}