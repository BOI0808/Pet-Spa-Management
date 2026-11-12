using PetSpa.Domain.Entities;
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

    Task<int> GetHoldMinutesAsync(CancellationToken ct = default);

    // Nhân viên spa đang hoạt động, kèm số lịch được phân công từ `since` đến nay (không tính lịch Cancelled).
    Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(DateTimeOffset since, CancellationToken ct = default);

    // Các lượt giữ chỗ nhân viên (IsHolding) có khoảng bận giao với [windowStart, windowEnd).
    Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
        DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default);

    // Lịch spa để xác nhận, đang được theo dõi (tracked) để cập nhật trạng thái; null nếu không có lịch hoặc không phải lịch spa.
    Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    // Trong số staffIds, các nhân viên spa đang hoạt động: StaffId → họ tên. Nhân viên khác vai trò hoặc đã vô hiệu hóa không có trong kết quả.
    Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
        IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default);

    // Thêm các dòng phân công vào DbContext, chưa ghi xuống CSDL (cùng kiểu IBookingRepository.AddSpaAppointment).
    void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments);
}

