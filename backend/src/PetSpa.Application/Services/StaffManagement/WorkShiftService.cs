using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.StaffManagement;

// Nhóm Staff (UC-35, FR-STF-04): quản lý ca làm của nhân viên spa. Chỉ Quản lý gọi được (policy Manager ở API).
// Giờ từ client có thể kèm offset (vd +07:00); Npgsql chỉ ghi/so sánh timestamptz với offset 0 nên đổi về UTC ở đây.
public sealed class WorkShiftService(IWorkShiftRepository shifts)
{
    public Task<PagedResult<WorkShiftItem>> ListAsync(
        Guid? staffId, DateTimeOffset? rangeStart, DateTimeOffset? rangeEnd,
        int page, int pageSize, CancellationToken ct = default) =>
        shifts.ListAsync(staffId, rangeStart?.ToUniversalTime(), rangeEnd?.ToUniversalTime(), page, pageSize, ct);

    public async Task<Guid> CreateAsync(
        Guid staffId, DateTimeOffset shiftStart, DateTimeOffset shiftEnd, CancellationToken ct = default)
    {
        // UC-35: chỉ thêm ca cho nhân viên spa đang hoạt động. Lễ tân, nhân viên đã vô hiệu hóa hoặc không tồn tại -> 400.
        if (!await shifts.IsActiveSpaStaffAsync(staffId, ct))
            throw new BusinessException(ErrorCodes.ValidationError, "Chỉ phân ca cho nhân viên spa đang hoạt động.");

        // Chồng ca do ràng buộc ex_shift_overlap của CSDL chặn khi lưu (409 SHIFT_OVERLAP).
        return await shifts.AddAsync(staffId, shiftStart.ToUniversalTime(), shiftEnd.ToUniversalTime(), ct);
    }
    
    public async Task UpdateAsync(
        Guid shiftId, DateTimeOffset shiftStart, DateTimeOffset shiftEnd, CancellationToken ct = default)
    {
        var start = shiftStart.ToUniversalTime();
        var end = shiftEnd.ToUniversalTime();

        var shift = await shifts.FindAsync(shiftId, ct) ?? throw new BusinessException(ErrorCodes.NotFound);

        // UC-35: phần của ca cũ không còn nằm trong ca mới thì không được còn lịch Confirmed của nhân viên đó.
        foreach (var (removedStart, removedEnd) in RemovedParts(shift, start, end))
        {
            if (await shifts.HasConfirmedAppointmentsAsync(shift.StaffId, removedStart, removedEnd, ct))
                throw new BusinessException(ErrorCodes.ShiftHasAppointments);
        }

        // Chồng ca do ràng buộc ex_shift_overlap của CSDL chặn khi lưu (409 SHIFT_OVERLAP).
        await shifts.UpdateAsync(shiftId, start, end, ct);
    }

    public async Task DeleteAsync(Guid shiftId, CancellationToken ct = default)
    {
        var shift = await shifts.FindAsync(shiftId, ct) ?? throw new BusinessException(ErrorCodes.NotFound);

        // Xóa ca là bỏ toàn bộ ca: cùng kiểm tra như sửa (API-Notes).
        if (await shifts.HasConfirmedAppointmentsAsync(shift.StaffId, shift.ShiftStart, shift.ShiftEnd, ct))
            throw new BusinessException(ErrorCodes.ShiftHasAppointments);

        await shifts.DeleteAsync(shiftId, ct);
    }

    // Phần của ca cũ không còn nằm trong ca mới: tối đa hai đoạn (phần đầu và phần cuối bị bỏ).
    private static IEnumerable<(DateTimeOffset Start, DateTimeOffset End)> RemovedParts(
        WorkShiftItem current, DateTimeOffset newStart, DateTimeOffset newEnd)
    {
        // Bỏ phần đầu: từ đầu ca cũ đến đầu ca mới (hoặc đến hết ca cũ nếu ca mới nằm hoàn toàn sau ca cũ).
        if (newStart > current.ShiftStart)
            yield return (current.ShiftStart, newStart < current.ShiftEnd ? newStart : current.ShiftEnd);

        // Bỏ phần cuối: từ cuối ca mới (hoặc từ đầu ca cũ nếu ca mới nằm hoàn toàn trước ca cũ) đến hết ca cũ.
        if (newEnd < current.ShiftEnd)
            yield return (newEnd > current.ShiftStart ? newEnd : current.ShiftStart, current.ShiftEnd);
    }
}