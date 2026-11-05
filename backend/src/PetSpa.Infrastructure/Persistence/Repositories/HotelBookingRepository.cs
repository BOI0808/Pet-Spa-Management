using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class HotelBookingRepository(AppDbContext db) : IHotelBookingRepository
{
    public Task<bool> IsCustomerBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
        db.Set<Customer>()
            .AsNoTracking()
            .Where(c => c.CustomerId == customerId)
            .Select(c => c.IsBookingLocked)
            .FirstOrDefaultAsync(ct);

    public Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
        db.Set<Cage>().CountAsync(c => c.IsActive && c.Species == species && c.SizeGroup == sizeGroup, ct);

    public async Task<IReadOnlyList<HotelAppointment>> ListHoldingStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
        await (
            from stay in db.Set<HotelAppointment>().AsNoTracking()
            join pet in db.Set<Pet>() on stay.PetId equals pet.PetId
            where pet.Species == species
                && stay.SizeGroup == sizeGroup
                && (stay.Status == AppointmentStatus.Pending
                    || stay.Status == AppointmentStatus.Confirmed
                    || stay.Status == AppointmentStatus.InStay)
                && stay.PlannedCheckIn < checkOut
                && stay.PlannedCheckOut > checkIn
            select stay)
            .ToListAsync(ct);

    public void Add(HotelAppointment appointment) => db.Set<HotelAppointment>().Add(appointment);
}