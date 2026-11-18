using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

// Port dữ liệu cho việc thực hiện lịch spa: bắt đầu, cập nhật tiến độ từng dịch vụ, hoàn tất (FR-EXE-03, FR-EXE-04).
public interface ISpaProgressRepository
{
    // Có yêu cầu xác nhận chi phí đang Pending không (BR-23).
    Task<bool> HasPendingCostConfirmationAsync(Guid appointmentId, CancellationToken ct = default);

    // Dòng dịch vụ của lịch hẹn, đang được theo dõi (tracked) để ghi khi IConcurrencyGuard.RunAsync kết thúc; null nếu không có.
    Task<AppointmentService?> FindServiceAsync(Guid appointmentId, Guid serviceId, CancellationToken ct = default);

    // Mọi dịch vụ của lịch hẹn đã IsDone (BR-06).
    Task<bool> AreAllServicesDoneAsync(Guid appointmentId, CancellationToken ct = default);

    // Thêm khoản thanh toán vào DbContext, chưa ghi xuống CSDL (cùng kiểu IAssignmentRepository.AddStaffAssignments).
    void AddPayment(Payment payment);
}
