using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

// Kết quả đề xuất nhân viên cho một lịch spa Chờ xác nhận.
public sealed record SpaSuggestionsResult(
    int StaffRequired, IReadOnlyList<StaffCandidate> Suggested, IReadOnlyList<StaffCandidate> Alternatives);

// Dịch vụ đề xuất phân công nhân viên spa cho quản lý.
public sealed class AssignmentService(IAssignmentRepository assignments, IBookingRepository bookings)
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
}

