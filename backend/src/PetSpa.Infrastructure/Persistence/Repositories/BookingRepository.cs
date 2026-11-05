using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Cài đặt IBookingRepository. Mọi mốc thời gian nhận vào đã ở UTC.
public sealed class BookingRepository(AppDbContext db) : IBookingRepository
{
    public async Task<IReadOnlyList<BookableService>> FindBookableServicesAsync(
        IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default)
    {
        var ids = serviceIds.ToList();

        var rows = await (
            from s in db.Set<Service>().AsNoTracking()
            join p in db.Set<ServicePricing>().AsNoTracking() on s.ServiceId equals p.ServiceId
            where ids.Contains(s.ServiceId) && s.IsActive && p.Species == species && p.SizeGroup == sizeGroup
            select new { s.ServiceId, s.LatestStartTime, p.DurationMinutes, p.StaffRequired })
            .ToListAsync(ct);

        return rows
            .Select(r => new BookableService(r.ServiceId, r.LatestStartTime, r.DurationMinutes, r.StaffRequired))
            .ToList();
    }

    public async Task<int> GetBufferMinutesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.BufferMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Booking.BufferMinutes.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }

    public async Task<IReadOnlyList<StaffShift>> ListSpaStaffShiftsAsync(
        DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default)
    {
        // Vai trò nằm ở Staff, trạng thái hoạt động nằm ở AppUser.
        var rows = await (
            from w in db.Set<WorkShift>().AsNoTracking()
            join s in db.Set<Staff>().AsNoTracking() on w.StaffId equals s.StaffId
            join u in db.Users.AsNoTracking() on s.UserId equals u.Id
            where s.StaffRole == StaffRole.SpaStaff && u.IsActive && w.ShiftStart < to && w.ShiftEnd > @from
            select new { w.StaffId, w.ShiftStart, w.ShiftEnd })
            .ToListAsync(ct);

        return rows.Select(r => new StaffShift(r.StaffId, r.ShiftStart, r.ShiftEnd)).ToList();
    }

    public async Task<IReadOnlyList<HeldBooking>> ListHeldBookingsAsync(
        DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default)
    {
        var rows = await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => (a.Status == AppointmentStatus.Pending
                         || a.Status == AppointmentStatus.Confirmed
                         || a.Status == AppointmentStatus.Received
                         || a.Status == AppointmentStatus.InProgress)
                        && a.SlotStart < to && a.BusyUntil > from)
            .Select(a => new { a.SlotStart, a.BusyUntil, a.StaffRequired })
            .ToListAsync(ct);

        return rows.Select(r => new HeldBooking(r.SlotStart, r.BusyUntil, r.StaffRequired)).ToList();
    }

    public async Task<IReadOnlyList<ServicePricing>> ListPricingAsync(
        IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default)
    {
        var ids = serviceIds.ToList();

        return await db.Set<ServicePricing>().AsNoTracking()
            .Where(p => ids.Contains(p.ServiceId) && p.Species == species && p.SizeGroup == sizeGroup)
            .ToListAsync(ct);
    }

    public void AddSpaAppointment(SpaAppointment appointment, IReadOnlyList<Guid> serviceIds)
    {
        db.Set<SpaAppointment>().Add(appointment);
        db.Set<AppointmentService>().AddRange(serviceIds.Select(serviceId => new AppointmentService
        {
            AppointmentId = appointment.AppointmentId,
            ServiceId = serviceId,
        }));
    }
}
