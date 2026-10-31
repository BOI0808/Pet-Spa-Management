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
}