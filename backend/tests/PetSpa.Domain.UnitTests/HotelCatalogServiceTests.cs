using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelCatalogServiceTests
{
    private sealed class FakeHotelCatalogRepository : IHotelCatalogRepository
    {
        public List<Cage> Cages { get; set; } = [];
        public List<CageStatus> CageStatuses { get; set; } = [];

        public Task AddCageAsync(Cage cage, CancellationToken ct = default)
        {
            if (Cages.Any(c => c.Code == cage.Code))
                throw new BusinessException(ErrorCodes.DuplicateCageCode);

            Cages.Add(cage);
            return Task.CompletedTask;
        }

        public Task<bool> UpdateCageAsync(
            Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default)
        {
            var cage = Cages.FirstOrDefault(c => c.CageId == cageId);
            if (cage is null) return Task.FromResult(false);

            if (code is not null)
            {
                if (Cages.Any(c => c.CageId != cageId && c.Code == code))
                    throw new BusinessException(ErrorCodes.DuplicateCageCode);
                cage.Code = code;
            }
            if (species.HasValue) cage.Species = species.Value;
            if (sizeGroup.HasValue) cage.SizeGroup = sizeGroup.Value;

            return Task.FromResult(true);
        }

        public Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default)
        {
            var cage = Cages.FirstOrDefault(c => c.CageId == cageId);
            if (cage is null) return Task.FromResult(false);

            cage.IsActive = isActive;
            return Task.FromResult(true);
        }

        public Task<PagedResult<CageStatus>> ListCagesAsync(int page, int pageSize, CancellationToken ct = default)
        {
            var total = CageStatuses.Count;
            var items = CageStatuses.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PagedResult<CageStatus>(items, page, pageSize, total));
        }

        public Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task SavePricingAsync(IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    [Fact]
    public async Task ListCagesAsync_ReturnsPagedCagesWithOccupants()
    {
        var repo = new FakeHotelCatalogRepository();
        var cage1 = new Cage { CageId = Guid.NewGuid(), Code = "C01", Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };
        var cage2 = new Cage { CageId = Guid.NewGuid(), Code = "C02", Species = Species.Cat, SizeGroup = SizeGroup.Medium, IsActive = true };

        repo.CageStatuses =
        [
            new CageStatus(cage1, new CageOccupant(Guid.NewGuid(), "Milo", Guid.NewGuid(), "Nguyen Van A", DateTimeOffset.UtcNow.AddDays(1))),
            new CageStatus(cage2, null),
        ];

        var sut = new HotelCatalogService(repo);
        var result = await sut.ListCagesAsync(1, 20);

        Assert.Equal(2, result.Total);
        Assert.Equal(2, result.Items.Count);
        Assert.NotNull(result.Items[0].Occupant);
        Assert.Equal("Milo", result.Items[0].Occupant!.PetName);
        Assert.Null(result.Items[1].Occupant);
    }

    [Fact]
    public async Task CreateCageAsync_WhenValid_AddsCageAndReturnsId()
    {
        var repo = new FakeHotelCatalogRepository();
        var sut = new HotelCatalogService(repo);

        var cageId = await sut.CreateCageAsync(new CageInput("  D01  ", Species.Dog, SizeGroup.Large));

        Assert.Single(repo.Cages);
        Assert.Equal(cageId, repo.Cages[0].CageId);
        Assert.Equal("D01", repo.Cages[0].Code);
        Assert.Equal(Species.Dog, repo.Cages[0].Species);
        Assert.Equal(SizeGroup.Large, repo.Cages[0].SizeGroup);
        Assert.True(repo.Cages[0].IsActive);
    }

    [Fact]
    public async Task UpdateCageAsync_WhenNotFound_ThrowsNotFound()
    {
        var repo = new FakeHotelCatalogRepository();
        var sut = new HotelCatalogService(repo);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.UpdateCageAsync(Guid.NewGuid(), new CageUpdateInput("D02", null, null)));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task SetCageActiveAsync_WhenNotFound_ThrowsNotFound()
    {
        var repo = new FakeHotelCatalogRepository();
        var sut = new HotelCatalogService(repo);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.SetCageActiveAsync(Guid.NewGuid(), false));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }
}

