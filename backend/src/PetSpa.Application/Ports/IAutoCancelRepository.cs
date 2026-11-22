namespace PetSpa.Application.Ports;

// Port truy vấn các lịch hẹn quá hạn cho tác vụ tự động.
// Chỉ lấy danh sách Id (không theo dõi thực thể); việc khóa, đọc lại và ghi nằm trong giao dịch của IConcurrencyGuard.
public interface IAutoCancelRepository
{
    // Id các lịch spa Đã xác nhận có SlotStart và lịch lưu trú Đã xác nhận có PlannedCheckIn sớm hơn cutoff.
    // cutoff = thời điểm hiện tại (UTC) trừ Booking.HoldMinutes.
    Task<IReadOnlyList<Guid>> ListNoShowCandidateIdsAsync(DateTimeOffset cutoff, CancellationToken ct = default);

    // AppointmentId của các yêu cầu xác nhận chi phí còn Pending nhưng đã quá ExpiresAt (ExpiresAt < now, now là UTC).
    Task<IReadOnlyList<Guid>> ListExpiredCostConfirmationAppointmentIdsAsync(
        DateTimeOffset now, CancellationToken ct = default);
}
