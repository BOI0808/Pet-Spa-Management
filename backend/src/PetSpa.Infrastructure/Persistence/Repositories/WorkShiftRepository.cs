using Microsoft.EntityFrameworkCore;
using Npgsql;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Adapter của IWorkShiftRepository. Mọi giờ nhận vào đã ở UTC (xem WorkShiftService).
public sealed class WorkShiftRepository(AppDbContext db) : IWorkShiftRepository
{
    public async Task<PagedResult<WorkShiftItem>> ListAsync(
        Guid? staffId, DateTimeOffset? rangeStart, DateTimeOffset? rangeEnd,
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Set<WorkShift>().AsNoTracking();

        if (staffId is not null) query = query.Where(w => w.StaffId == staffId.Value);
        // Ca giao với [rangeStart, rangeEnd]: cuối ca sau rangeStart và đầu ca trước rangeEnd.
        if (rangeStart is not null) query = query.Where(w => w.ShiftEnd > rangeStart.Value);
        if (rangeEnd is not null) query = query.Where(w => w.ShiftStart < rangeEnd.Value);

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(w => w.ShiftStart).ThenBy(w => w.ShiftId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        var items = rows.Select(ToItem).ToList();
        return new PagedResult<WorkShiftItem>(items, page, pageSize, total);
    }

    public async Task<bool> IsActiveSpaStaffAsync(Guid staffId, CancellationToken ct = default)
    {
        // Vai trò nằm ở Staff, trạng thái hoạt động nằm ở AppUser.
        var query = from s in db.Set<Staff>()
                    join u in db.Users on s.UserId equals u.Id
                    where s.StaffId == staffId && s.StaffRole == StaffRole.SpaStaff && u.IsActive
                    select s.StaffId;

        return await query.AnyAsync(ct);
    }
        public async Task<WorkShiftItem?> FindAsync(Guid shiftId, CancellationToken ct = default)
    {
        var shift = await db.Set<WorkShift>().AsNoTracking().FirstOrDefaultAsync(w => w.ShiftId == shiftId, ct);
        return shift is null ? null : ToItem(shift);
    }

    public Task<bool> HasConfirmedAppointmentsAsync(
        Guid staffId, DateTimeOffset rangeStart, DateTimeOffset rangeEnd, CancellationToken ct = default)
    {
        // BusyFrom/BusyUntil là khoảng nhân viên bị giữ bận của lịch (AppointmentStaff).
        var query = from asg in db.Set<AppointmentStaff>()
                    join a in db.Set<Appointment>() on asg.AppointmentId equals a.AppointmentId
                    where asg.StaffId == staffId
                          && a.Status == AppointmentStatus.Confirmed
                          && asg.BusyFrom < rangeEnd && asg.BusyUntil > rangeStart
                    select asg.AppointmentId;

        return query.AnyAsync(ct);
    }
    public async Task<Guid> AddAsync(
        Guid staffId, DateTimeOffset shiftStart, DateTimeOffset shiftEnd, CancellationToken ct = default)
    {
        var shift = new WorkShift
        {
            ShiftId = Guid.NewGuid(),
            StaffId = staffId,
            ShiftStart = shiftStart,
            ShiftEnd = shiftEnd,
        };
        db.Set<WorkShift>().Add(shift);
        await SaveAsync(ct);
        return shift.ShiftId;
    }
    
    public async Task UpdateAsync(
        Guid shiftId, DateTimeOffset shiftStart, DateTimeOffset shiftEnd, CancellationToken ct = default)
    {
        var shift = await db.Set<WorkShift>().FirstOrDefaultAsync(w => w.ShiftId == shiftId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        shift.ShiftStart = shiftStart;
        shift.ShiftEnd = shiftEnd;
        await SaveAsync(ct);
    }

    public Task DeleteAsync(Guid shiftId, CancellationToken ct = default) =>
        db.Set<WorkShift>().Where(w => w.ShiftId == shiftId).ExecuteDeleteAsync(ct);

    private static WorkShiftItem ToItem(WorkShift w) => new(w.ShiftId, w.StaffId, w.ShiftStart, w.ShiftEnd);

    // Chồng ca do ràng buộc loại trừ ex_shift_overlap của CSDL chặn (Backend-Conventions: bảng ràng buộc CSDL).
    private async Task SaveAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.ExclusionViolation,
                ConstraintName: "ex_shift_overlap"
            })
        {
            throw new BusinessException(ErrorCodes.ShiftOverlap);
        }
    }
}