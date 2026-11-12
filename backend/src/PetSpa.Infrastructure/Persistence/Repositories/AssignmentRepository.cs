using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Cài đặt IAssignmentRepository. Mọi mốc thời gian nhận vào đã ở UTC.
public sealed class AssignmentRepository(AppDbContext db) : IAssignmentRepository
{
    public async Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var row = await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new { a.Status, a.SlotStart, a.BusyUntil, a.StaffRequired })
            .FirstOrDefaultAsync(ct);

        return row is null
            ? null
            : new SpaAppointmentWindow(row.Status, row.SlotStart, row.BusyUntil, row.StaffRequired);
    }

    public async Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Suggest.LookbackDays")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Suggest.LookbackDays.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }

    public async Task<int> GetHoldMinutesAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Booking.HoldMinutes")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Booking.HoldMinutes.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }

    public async Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(
        DateTimeOffset since, CancellationToken ct = default)
    {
        // Vai trò nằm ở Staff, trạng thái hoạt động nằm ở AppUser.
        var staff = await (
            from s in db.Set<Staff>().AsNoTracking()
            join u in db.Users.AsNoTracking() on s.UserId equals u.Id
            where s.StaffRole == StaffRole.SpaStaff && u.IsActive
            select new { s.StaffId, s.FullName })
            .ToListAsync(ct);

        // Số lịch được phân công từ `since` đến nay, không tính lịch Cancelled.
        var counts = await (
            from asg in db.Set<AppointmentStaff>().AsNoTracking()
            join a in db.Set<Appointment>().AsNoTracking() on asg.AppointmentId equals a.AppointmentId
            where asg.AssignedAt >= since && a.Status != AppointmentStatus.Cancelled
            group asg by asg.StaffId into g
            select new { StaffId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StaffId, x => x.Count, ct);

        return staff
            .Select(s => new StaffCandidate(s.StaffId, s.FullName, counts.GetValueOrDefault(s.StaffId)))
            .ToList();
    }

    public async Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
        DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default)
    {
        var rows = await db.Set<AppointmentStaff>().AsNoTracking()
            .Where(a => a.IsHolding && a.BusyFrom < windowEnd && a.BusyUntil > windowStart)
            .Select(a => new { a.StaffId, a.BusyFrom, a.BusyUntil })
            .ToListAsync(ct);

        return rows.Select(r => new StaffAssignment(r.StaffId, r.BusyFrom, r.BusyUntil)).ToList();
    }

    public async Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var row = await db.Set<Appointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new { IsSpa = a is SpaAppointment })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;
        return row.IsSpa ? AppointmentType.Spa : AppointmentType.Hotel;
    }

    public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<SpaAppointment>().FirstOrDefaultAsync(a => a.AppointmentId == appointmentId, ct);

    public async Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
        IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default)
    {
        var ids = staffIds.ToList();

        // Vai trò nằm ở Staff, trạng thái hoạt động nằm ở AppUser.
        return await (
            from s in db.Set<Staff>().AsNoTracking()
            join u in db.Users.AsNoTracking() on s.UserId equals u.Id
            where ids.Contains(s.StaffId) && s.StaffRole == StaffRole.SpaStaff && u.IsActive
            select new { s.StaffId, s.FullName })
            .ToDictionaryAsync(x => x.StaffId, x => x.FullName, ct);
    }

    public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) =>
        db.Set<AppointmentStaff>().AddRange(assignments);
}

