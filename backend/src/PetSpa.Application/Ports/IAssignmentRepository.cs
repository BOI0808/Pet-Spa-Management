using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Ports;

// Khoảng giữ chỗ và số nhân viên cần của một lịch spa. Thời điểm ở UTC; BusyUntil đã gồm thời gian dọn dẹp.
public sealed record SpaAppointmentWindow(
    AppointmentStatus Status, DateTimeOffset SlotStart, DateTimeOffset BusyUntil, int StaffRequired);

// Port truy vấn dữ liệu phân công nhân viên spa. Các thời điểm truyền vào đã ở UTC.
public interface IAssignmentRepository
{
    // null nếu không có lịch hoặc lịch không phải lịch spa.
    Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default);

    // Lấy số ngày xét lịch phân công gần nhất.
    Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default);

    // Nhân viên spa đang hoạt động, kèm số lịch được phân công từ `since` đến nay (không tính lịch Cancelled).
    Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(DateTimeOffset since, CancellationToken ct = default);

    // Các lượt giữ chỗ nhân viên (IsHolding) có khoảng bận giao với [windowStart, windowEnd).
    Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
        DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default);
}

