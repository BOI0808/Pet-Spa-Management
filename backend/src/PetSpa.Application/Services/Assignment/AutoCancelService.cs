using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Assignment;

// Tác vụ tự động: hủy lịch hẹn quá hạn.
// Mỗi lịch hẹn được xử lý trong một giao dịch riêng: khóa dòng, ĐỌC LẠI điều kiện, rồi mới ghi.
// Nhờ vậy chạy lặp hoặc chạy đồng thời không xử lý trùng một lịch hẹn,
// và lịch vừa được tiếp nhận kịp thì bị bỏ qua.
public sealed class AutoCancelService(
    IAutoCancelRepository candidates,
    IAssignmentRepository assignments,
    IAppointmentChangeRepository appointments,
    ICostConfirmationRepository costConfirmations,
    IConcurrencyGuard concurrencyGuard)
{
    // Trả về số lịch hẹn đã bị hủy trong lần chạy này.
    public Task<int> RunAsync(CancellationToken ct = default) => CancelNoShowAsync(ct);

    // Lịch Đã xác nhận quá thời gian giữ chỗ sau giờ hẹn mà chưa được tiếp nhận.
    // Lịch lưu trú không cần thao tác giải phóng chuồng riêng: chuồng chỉ bị giữ khi lịch ở Confirmed/InStay.
    private async Task<int> CancelNoShowAsync(CancellationToken ct)
    {
        var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-holdMinutes);
        var ids = await candidates.ListNoShowCandidateIdsAsync(cutoff, ct);

        var processed = 0;
        foreach (var id in ids)
        {
            var cancelled = await concurrencyGuard.RunAsync(async () =>
            {
                await concurrencyGuard.LockAppointmentAsync(id, ct);

                var found = await appointments.FindWithOwnerAsync(id, asNoTracking: false, ct);
                if (found is null || !IsNoShow(found.Appointment, cutoff))
                    return false;

                var appointment = found.Appointment;
                appointment.Cancel(CancelReason.NoShow);

                // Giống các luồng hủy khác: đóng yêu cầu xác nhận chi phí đang chờ (nếu có).
                var pendingCost = await costConfirmations.FindPendingAsync(id, ct);
                pendingCost?.Expire();

                if (appointment is SpaAppointment)
                    await appointments.ReleaseStaffHoldsAsync(id, ct);

                return true;
            }, ct);

            if (cancelled) processed++;
        }

        return processed;
    }

    private static bool IsNoShow(Appointment appointment, DateTimeOffset cutoff)
    {
        if (appointment.Status != AppointmentStatus.Confirmed)
            return false;

        return appointment switch
        {
            SpaAppointment spa => spa.SlotStart < cutoff,
            HotelAppointment stay => stay.PlannedCheckIn < cutoff,
            _ => false,
        };
    }
}
