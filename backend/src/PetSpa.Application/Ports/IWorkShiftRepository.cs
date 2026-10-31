using PetSpa.Application.Common;

namespace PetSpa.Application.Ports;

// Một ca làm. Giờ là DateTimeOffset ở UTC (Application đổi về UTC trước khi gọi port).
public sealed record WorkShiftItem(Guid ShiftId, Guid StaffId, DateTimeOffset ShiftStart, DateTimeOffset ShiftEnd);

public interface IWorkShiftRepository
{
    // Lọc tùy chọn theo nhân viên và theo khoảng [rangeStart, rangeEnd]: lấy ca giao với khoảng đó.
    Task<PagedResult<WorkShiftItem>> ListAsync(
        Guid? staffId, DateTimeOffset? rangeStart, DateTimeOffset? rangeEnd,
        int page, int pageSize, CancellationToken ct = default);

    // Nhân viên tồn tại, là nhân viên spa và tài khoản đang hoạt động.
    Task<bool> IsActiveSpaStaffAsync(Guid staffId, CancellationToken ct = default);

    // Chồng ca của cùng nhân viên: ném SHIFT_OVERLAP (do ràng buộc ex_shift_overlap của CSDL). Trả ShiftId.
    Task<Guid> AddAsync(Guid staffId, DateTimeOffset shiftStart, DateTimeOffset shiftEnd, CancellationToken ct = default);
}