using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Cài đặt IBookingRepository. Mọi mốc thời gian nhận vào đã ở UTC.
public sealed class BookingRepository(AppDbContext db, ShopTimeZone shopTimeZone) : IBookingRepository
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

    public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
        db.Set<Customer>().AsNoTracking()
            .Where(c => c.CustomerId == customerId)
            .Select(c => c.IsBookingLocked)
            .FirstOrDefaultAsync(ct);

    public async Task<PagedResult<AppointmentListItem>> ListAppointmentsAsync(
        AppointmentType? type, AppointmentStatus? status, DateOnly? date, AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default)
    {
        var appointments = db.Set<Appointment>().AsNoTracking();

        if (type == AppointmentType.Spa) appointments = appointments.Where(a => a is SpaAppointment);
        else if (type == AppointmentType.Hotel) appointments = appointments.Where(a => a is HotelAppointment);

        if (status is not null) appointments = appointments.Where(a => a.Status == status.Value);

        appointments = AppointmentQueryHelper.FilterByDate(appointments, date, shopTimeZone);

        // Tên khách và tên thú cưng để hiển thị danh sách.
        var query = from a in appointments
                    join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
                    join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
                    select new AppointmentQueryRow { Appointment = a, CustomerName = c.FullName, PetName = p.Name };

        var total = await query.CountAsync(ct);
        var effectiveSort = AppointmentQueryHelper.ResolveEffectiveSort(sort, date, status);
        var rows = await AppointmentQueryHelper.ApplySort(query, effectiveSort)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        var items = rows.Select(r => ToListItem(r.Appointment, r.CustomerName, r.PetName)).ToList();
        return new PagedResult<AppointmentListItem>(items, page, pageSize, total);
    }

    // Lịch spa và lưu trú dùng chung một bảng; cột của loại kia để null.
    private static AppointmentListItem ToListItem(Appointment a, string customerName, string petName)
    {
        var spa = a as SpaAppointment;
        var hotel = a as HotelAppointment;

        return new AppointmentListItem(
            a.AppointmentId, spa is not null ? AppointmentType.Spa : AppointmentType.Hotel,
            a.CustomerId, a.PetId, customerName, petName,
            a.Status, a.CancelReason, a.CancelledAt, a.SizeGroup, a.ActualWeightKg,
            spa?.SlotStart, spa?.SlotEnd, spa?.StaffRequired,
            hotel?.PlannedCheckIn, hotel?.PlannedCheckOut, hotel?.ActualCheckOut, hotel?.CageId,
            a.CreatedAt, a.UpdatedAt);
    }
}
