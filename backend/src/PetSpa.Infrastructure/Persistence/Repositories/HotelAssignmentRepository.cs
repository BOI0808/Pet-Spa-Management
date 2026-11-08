using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelAssignmentRepository(AppDbContext db) : IHotelAssignmentRepository
{
    public async Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(
        Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default)
    {
        var staysQuery = asNoTracking ? db.Set<HotelAppointment>().AsNoTracking() : db.Set<HotelAppointment>();
        var row = await (
            from stay in staysQuery
            join pet in db.Set<Pet>() on stay.PetId equals pet.PetId
            where stay.AppointmentId == appointmentId
            select new { Stay = stay, pet.Species })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new HotelAppointmentWithSpecies(row.Stay, row.Species);
    }

    public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) =>
        db.Set<Cage>().FirstOrDefaultAsync(c => c.CageId == cageId, ct);

    public async Task<IReadOnlyList<Cage>> ListActiveCagesAsync(
        Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
        await db.Set<Cage>()
            .AsNoTracking()
            .Where(c => c.IsActive && c.Species == species && c.SizeGroup == sizeGroup)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
        await (
            from stay in db.Set<HotelAppointment>().AsNoTracking()
            join cage in db.Set<Cage>() on stay.CageId equals (Guid?)cage.CageId
            where cage.Species == species
                && cage.SizeGroup == sizeGroup
                && (stay.Status == AppointmentStatus.Confirmed || stay.Status == AppointmentStatus.InStay)
                && stay.PlannedCheckIn < checkOut
                && stay.PlannedCheckOut > checkIn
            select stay)
            .ToListAsync(ct);
}