using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

// Kết quả đề xuất nhân viên cho một lịch spa Chờ xác nhận.
public sealed record SpaSuggestionsResult(
    int StaffRequired, IReadOnlyList<StaffCandidate> Suggested, IReadOnlyList<StaffCandidate> Alternatives);

// Kết quả xác nhận lịch spa. Amount là số tiền tính lại theo dịch vụ, nhóm kích cỡ và đơn giá hiện tại (BR-26);
// không lưu vào CSDL (Backend-Conventions 4.5), để thông báo xác nhận dùng sau.
public sealed record SpaConfirmResult(AppointmentStatus Status, decimal Amount);

// Dịch vụ phân công nhân viên spa cho quản lý: đề xuất và xác nhận.
public sealed class AssignmentService(
    IAssignmentRepository assignments,
    IBookingRepository bookings,
    IPaymentAmountRepository paymentAmounts,
    IConcurrencyGuard concurrencyGuard)
{
    // Đề xuất nhân viên phù hợp cho lịch spa; chỉ đề xuất, không ghi dữ liệu và không giữ chỗ.
    public async Task<SpaSuggestionsResult> GetSuggestionsAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var appointment = await assignments.FindSpaWindowAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        // Chỉ lịch Chờ xác nhận mới có đề xuất; lịch ở trạng thái khác trả 409 INVALID_TRANSITION.
        if (appointment.Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        var lookbackDays = await assignments.GetSuggestLookbackDaysAsync(ct);
        var since = DateTimeOffset.UtcNow.AddDays(-lookbackDays);

        // Khoảng giữ chỗ đã chốt lúc đặt: [SlotStart, BusyUntil), BusyUntil gồm thời gian dọn dẹp.
        var staff = await assignments.ListSpaStaffCandidatesAsync(since, ct);
        var shifts = await bookings.ListSpaStaffShiftsAsync(appointment.SlotStart, appointment.BusyUntil, ct);
        var held = await assignments.ListHoldingAssignmentsAsync(appointment.SlotStart, appointment.BusyUntil, ct);

        var result = SlotService.SuggestStaff(
            staff, shifts, held, appointment.SlotStart, appointment.BusyUntil, appointment.StaffRequired);

        return new SpaSuggestionsResult(appointment.StaffRequired, result.Suggested, result.Alternatives);
    }

    // Xác nhận lịch spa kèm nhân viên (FR-ASG-02, FR-ASG-03). Mẫu giao dịch theo Backend-Conventions 7.2:
    // khóa dòng lịch hẹn, đọc lại điều kiện trong khóa rồi mới ghi. Hai lịch khác nhau xác nhận cùng lúc cho
    // cùng một nhân viên: ràng buộc ex_staff_busy chặn bên sau, RunAsync đổi thành 409 STAFF_CONFLICT (BR-04, BR-18).
    public async Task<SpaConfirmResult> ConfirmSpaAsync(
        Guid appointmentId, IReadOnlyCollection<Guid> staffIds, bool confirmOutOfShift, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            // Chỉ lịch Chờ xác nhận mới được xác nhận (BR-14).
            if (appointment.Status != AppointmentStatus.Pending)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            // Đủ số nhân viên cần của lịch (BR-03); chọn trùng một người hai lần chỉ tính một.
            var chosenIds = staffIds.Distinct().ToList();
            if (chosenIds.Count != appointment.StaffRequired)
                throw new BusinessException(ErrorCodes.StaffCountMismatch);

            // Chỉ phân công nhân viên spa đang hoạt động.
            var names = await assignments.ListActiveSpaStaffNamesAsync(chosenIds, ct);
            if (names.Count != chosenIds.Count)
                throw new BusinessException(ErrorCodes.ValidationError, "Chỉ phân công nhân viên spa đang hoạt động.");

            // Không trùng khung giờ với lịch đang giữ chỗ khác, tính cả thời gian dọn dẹp (BR-04).
            var held = await assignments.ListHoldingAssignmentsAsync(appointment.SlotStart, appointment.BusyUntil, ct);
            if (held.Any(h => chosenIds.Contains(h.StaffId)))
                throw new BusinessException(ErrorCodes.StaffConflict);

            // Nhân viên ngoài ca: cảnh báo, chỉ lưu khi quản lý gửi lại với confirmOutOfShift = true (UC-12).
            if (!confirmOutOfShift)
            {
                var shifts = await bookings.ListSpaStaffShiftsAsync(appointment.SlotStart, appointment.BusyUntil, ct);
                var outOfShift = SlotService.FindStaffOutOfShift(
                    chosenIds, shifts, appointment.SlotStart, appointment.BusyUntil);

                if (outOfShift.Count > 0)
                    throw new BusinessException(
                        ErrorCodes.StaffOutOfShift,
                        $"Nhân viên không có ca làm phủ khung giờ này: {string.Join(", ", outOfShift.Select(id => names[id]))}. "
                        + "Gửi confirmOutOfShift = true để vẫn xác nhận.");
            }

            assignments.AddStaffAssignments(appointment.AssignStaff(chosenIds));

            // Tính lại số tiền theo dịch vụ, nhóm kích cỡ, đơn giá hiện tại (FR-ASG-03, BR-26). CSDL không lưu tiền spa
            // và không có cờ "khách đã đổi lịch", nên luôn tính; kết quả đúng cả với lịch mới tạo.
            var snapshot = await paymentAmounts.GetSpaAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var amount = PricingService.CalculateSpaAmount(
                snapshot.Species, snapshot.SizeGroup, snapshot.ServiceIds, snapshot.Pricing);

            return new SpaConfirmResult(appointment.Status, amount);
        }, ct);
    }
}

