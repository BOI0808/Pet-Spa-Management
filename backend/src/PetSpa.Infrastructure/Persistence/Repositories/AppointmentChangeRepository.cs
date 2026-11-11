using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Cài đặt IAppointmentChangeRepository.
public sealed class AppointmentChangeRepository(AppDbContext db) : IAppointmentChangeRepository
{
    public async Task<AppointmentWithOwner?> FindWithOwnerAsync(
        Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default)
    {
        var appointments = asNoTracking ? db.Set<Appointment>().AsNoTracking() : db.Set<Appointment>();

        var row = await (
            from a in appointments
            join c in db.Set<Customer>() on a.CustomerId equals c.CustomerId
            where a.AppointmentId == appointmentId
            select new { Appointment = a, OwnerUserId = c.UserId })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new AppointmentWithOwner(row.Appointment, row.OwnerUserId);
    }

    public async Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.ChangeCancelDeadlineMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Booking.ChangeCancelDeadlineMinutes.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }

    public async Task ReplaceServicesAsync(
        Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default)
    {
        await db.Set<AppointmentService>().Where(s => s.AppointmentId == appointmentId).ExecuteDeleteAsync(ct);

        db.Set<AppointmentService>().AddRange(serviceIds.Select(serviceId => new AppointmentService
        {
            AppointmentId = appointmentId,
            ServiceId = serviceId,
        }));
    }

    public Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<AppointmentStaff>().Where(s => s.AppointmentId == appointmentId).ExecuteDeleteAsync(ct);

    public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<AppointmentStaff>()
            .Where(s => s.AppointmentId == appointmentId && s.IsHolding)
            .ExecuteUpdateAsync(setters => setters.SetProperty(a => a.IsHolding, false), ct);
}
