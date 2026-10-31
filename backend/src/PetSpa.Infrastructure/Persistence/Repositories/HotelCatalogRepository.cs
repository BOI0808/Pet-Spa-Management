using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelCatalogRepository(AppDbContext db) : IHotelCatalogRepository
{
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

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}