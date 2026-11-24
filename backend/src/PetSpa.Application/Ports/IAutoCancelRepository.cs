namespace PetSpa.Application.Ports;

// Quy tắc khóa tự đặt lịch (BR-15): quá LockThreshold lần vắng mặt trong WindowDays ngày gần nhất thì khóa.
// Giá trị đọc từ SystemConfig (NoShow.LockThreshold, NoShow.WindowDays).
public sealed record NoShowLockRule(int LockThreshold, int WindowDays);

// Port truy vấn các lịch hẹn quá hạn cho tác vụ tự động, và theo dõi vắng mặt để khóa tự đặt lịch (FR-BOOK-06).
// Chỉ lấy danh sách Id (không theo dõi thực thể); việc khóa, đọc lại và ghi nằm trong giao dịch của IConcurrencyGuard.
public interface IAutoCancelRepository
{
    // Id các lịch spa Đã xác nhận có SlotStart và lịch lưu trú Đã xác nhận có PlannedCheckIn sớm hơn cutoff.
    // cutoff = thời điểm hiện tại (UTC) trừ Booking.HoldMinutes.
    Task<IReadOnlyList<Guid>> ListNoShowCandidateIdsAsync(DateTimeOffset cutoff, CancellationToken ct = default);

    // AppointmentId của các yêu cầu xác nhận chi phí còn Pending nhưng đã quá ExpiresAt (ExpiresAt < now, now là UTC).
    Task<IReadOnlyList<Guid>> ListExpiredCostConfirmationAppointmentIdsAsync(
        DateTimeOffset now, CancellationToken ct = default);

    // Quy tắc khóa tự đặt lịch hiện hành (NoShow.LockThreshold, NoShow.WindowDays).
    Task<NoShowLockRule> GetNoShowLockRuleAsync(CancellationToken ct = default);

    // Số lịch hẹn (spa và lưu trú) của khách đã bị hủy do vắng mặt, có CancelledAt từ `since` đến nay (UTC).
    // Chỉ đếm dữ liệu đã ghi xuống CSDL.
    Task<int> CountNoShowsSinceAsync(Guid customerId, DateTimeOffset since, CancellationToken ct = default);

    // Đặt Customer.IsBookingLocked = true. Chỉ gọi bên trong IConcurrencyGuard.RunAsync.
    // Khách đã bị khóa rồi thì không đổi gì.
    Task LockBookingAsync(Guid customerId, CancellationToken ct = default);
}
