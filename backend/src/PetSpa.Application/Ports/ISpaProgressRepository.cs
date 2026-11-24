using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public sealed record SpaServiceProgressLine(Guid ServiceId, bool IsDone);

// Port dữ liệu cho việc thực hiện lịch spa: bắt đầu, cập nhật tiến độ từng dịch vụ, hoàn tất (FR-EXE-03, FR-EXE-04).
public interface ISpaProgressRepository
{
    // Có yêu cầu xác nhận chi phí đang Pending không (BR-23).
    Task<bool> HasPendingCostConfirmationAsync(Guid appointmentId, CancellationToken ct = default);

    // Dòng dịch vụ của lịch hẹn, đang được theo dõi (tracked) để ghi khi IConcurrencyGuard.RunAsync kết thúc; null nếu không có.
    Task<AppointmentService?> FindServiceAsync(Guid appointmentId, Guid serviceId, CancellationToken ct = default);

    // Danh sách dòng dịch vụ (ServiceId, IsDone) để kiểm tra hoàn tất và tái sử dụng cho tính tiền trong 1 lần query duy nhất.
    Task<IReadOnlyList<SpaServiceProgressLine>> ListServiceLinesAsync(Guid appointmentId, CancellationToken ct = default);

    // Mọi dịch vụ của lịch hẹn đã IsDone (BR-06).
    Task<bool> AreAllServicesDoneAsync(Guid appointmentId, CancellationToken ct = default);

    // Thêm khoản thanh toán vào DbContext, chưa ghi xuống CSDL (cùng kiểu IAssignmentRepository.AddStaffAssignments).
    void AddPayment(Payment payment);
}
