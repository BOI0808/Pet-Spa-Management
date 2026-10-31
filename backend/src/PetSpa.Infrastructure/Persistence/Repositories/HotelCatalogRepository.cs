using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelCatalogRepository(AppDbContext db) : IHotelCatalogRepository
{
    private const string LateFeeKey = "Hotel.LateFeePerBlock";
    public async Task AddCageAsync(Cage cage, CancellationToken ct = default)
    {
        db.Set<Cage>().Add(cage);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateCageCode);
        }
    }

    public async Task<bool> UpdateCageAsync(
        Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default)
    {
        var cage = await db.Set<Cage>().FirstOrDefaultAsync(c => c.CageId == cageId, ct);
        if (cage is null) return false;

        if (code is not null) cage.Code = code;
        if (species is not null) cage.Species = species.Value;
        if (sizeGroup is not null) cage.SizeGroup = sizeGroup.Value;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new BusinessException(ErrorCodes.DuplicateCageCode);
        }

        return true;
    }

    public async Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default)
    {
        var affected = await db.Set<Cage>()
            .Where(c => c.CageId == cageId)
            .ExecuteUpdateAsync(c => c.SetProperty(x => x.IsActive, isActive), ct);

        return affected > 0;
    }

    public async Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default)
    {
        var rows = await db.Set<HotelPricing>().AsNoTracking().ToListAsync(ct);

        var lateFee = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == LateFeeKey)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        return new HotelPricingSnapshot(
            rows.OrderBy(p => p.Species).ThenBy(p => p.SizeGroup).ToList(),
            lateFee is null ? 0m : decimal.Parse(lateFee, CultureInfo.InvariantCulture));
    }

    public async Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) =>
        await db.Set<SizeRule>().AsNoTracking().ToListAsync(ct);

    public async Task SavePricingAsync(
        IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default)
    {
        var currentRows = await db.Set<HotelPricing>().ToListAsync(ct);

        foreach (var row in pricing)
        {
            var existing = currentRows.FirstOrDefault(c => c.Species == row.Species && c.SizeGroup == row.SizeGroup);
            if (existing is null)
            {
                db.Set<HotelPricing>().Add(row);
                continue;
            }

            existing.PricePerNight = row.PricePerNight;
            existing.FoodPerNight = row.FoodPerNight;
        }

        var value = lateFeePerBlock.ToString("0", CultureInfo.InvariantCulture);
        var config = await db.Set<SystemConfig>().FirstOrDefaultAsync(c => c.ConfigKey == LateFeeKey, ct);
        if (config is null)
        {
            db.Set<SystemConfig>().Add(new SystemConfig
            {
                ConfigKey = LateFeeKey,
                ConfigValue = value,
                Description = "Mức phí phạt trả muộn mỗi lần (VND), do quản lý thiết lập (BR-22, FR-HTL-03)",
            });
        }
        else
        {
            config.ConfigValue = value;
        }

        await db.SaveChangesAsync(ct);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}