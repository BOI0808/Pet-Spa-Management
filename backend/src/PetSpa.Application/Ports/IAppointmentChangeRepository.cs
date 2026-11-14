using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

// Lịch hẹn kèm tài khoản của khách sở hữu (null nếu khách vãng lai) để kiểm tra BR-16.
public sealed record AppointmentWithOwner(Appointment Appointment, Guid? OwnerUserId);

// Port riêng cho việc đổi/hủy lịch hẹn: khách tự đổi/hủy (UC-14, FR-CHG-01, FR-CHG-02), quản lý đổi/hủy (UC-15, FR-CHG-03).
public interface IAppointmentChangeRepository
{
    // null nếu không có lịch hẹn. asNoTracking = false: thực thể được theo dõi để ghi khi IConcurrencyGuard.RunAsync kết thúc.
    Task<AppointmentWithOwner?> FindWithOwnerAsync(
        Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default);

    // Hạn tự đổi/hủy trước giờ hẹn, tính bằng phút (Booking.ChangeCancelDeadlineMinutes, BR-08).
    Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default);

    // Thay toàn bộ dịch vụ của lịch spa bằng danh sách mới. Chỉ gọi bên trong IConcurrencyGuard.RunAsync.
    Task ReplaceServicesAsync(Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default);

    // Lịch spa về Chờ xác nhận: xóa các dòng phân công nhân viên (Backend-Conventions 4.3).
    // Chỉ gọi bên trong IConcurrencyGuard.RunAsync.
    Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default);

    // Lịch spa bị hủy: nhả giữ chỗ nhân viên (IsHolding = false), giữ dòng làm lịch sử công việc (Backend-Conventions 4.3).
    // Chỉ gọi bên trong IConcurrencyGuard.RunAsync.
    Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default);

    Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default);
}
