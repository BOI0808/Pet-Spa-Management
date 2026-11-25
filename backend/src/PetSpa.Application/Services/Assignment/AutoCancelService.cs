using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
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
    IConcurrencyGuard concurrencyGuard,
    AppointmentNotifier notifier)
{
    // Trả về số lịch hẹn đã bị hủy trong lần chạy này.
    public async Task<int> RunAsync(CancellationToken ct = default)
    {
        var processed = await CancelNoShowAsync(ct);
        processed += await CancelUnconfirmedCostAsync(ct);
        return processed;
    }

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
            try
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

                    // FR-BOOK-06 (BR-15): xét khóa tự đặt lịch trong cùng giao dịch với việc hủy để không bỏ sót.
                    await LockBookingIfExceededAsync(appointment.CustomerId, ct);

                    return true;
                }, ct);

                if (cancelled)
                {
                    processed++;
                    await notifier.NotifyCancelledAsync(id, ct);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Bỏ qua lỗi từng phần tử để không làm gián đoạn các lịch hẹn hợp lệ khác trong batch
                continue;
            }
        }

        return processed;
    }

    // BR-15: quá NoShow.LockThreshold lần vắng mặt trong NoShow.WindowDays ngày gần nhất thì khóa quyền tự đặt lịch.
    // Gọi sau khi appointment.Cancel(NoShow); lịch vừa hủy chưa được ghi xuống CSDL (ghi khi giao dịch kết thúc)
    // nên số lần đã ghi nhận được cộng thêm 1 cho lịch này.
    private async Task LockBookingIfExceededAsync(Guid customerId, CancellationToken ct)
    {
        var rule = await candidates.GetNoShowLockRuleAsync(ct);
        var since = DateTimeOffset.UtcNow.AddDays(-rule.WindowDays);

        var noShowCount = await candidates.CountNoShowsSinceAsync(customerId, since, ct) + 1;
        if (noShowCount > rule.LockThreshold)
            await candidates.LockBookingAsync(customerId, ct);
    }

    // Khách không phản hồi chi phí mới trong CostConfirm.TimeoutMinutes (30 phút).
    // ExpiresAt đã được chốt lúc tạo yêu cầu (CreatedAt + CostConfirm.TimeoutMinutes) nên chỉ cần so với hiện tại.
    private async Task<int> CancelUnconfirmedCostAsync(CancellationToken ct)
    {
        var ids = await candidates.ListExpiredCostConfirmationAppointmentIdsAsync(DateTimeOffset.UtcNow, ct);

        var processed = 0;
        foreach (var id in ids)
        {
            try
            {
                var cancelled = await concurrencyGuard.RunAsync(async () =>
                {
                    await concurrencyGuard.LockAppointmentAsync(id, ct);

                    var confirmation = await costConfirmations.FindPendingAsync(id, ct);
                    if (confirmation is null || confirmation.ExpiresAt >= DateTimeOffset.UtcNow)
                        return false;

                    // Luôn đóng yêu cầu chi phí đã quá hạn để tránh rò rỉ bản ghi zombie trong CSDL
                    confirmation.Expire();

                    var found = await appointments.FindWithOwnerAsync(id, asNoTracking: false, ct);
                    if (found is null || found.Appointment.Status != AwaitingStatus(found.Appointment))
                        return false;

                    var appointment = found.Appointment;
                    appointment.Cancel(CancelReason.CostNotConfirmed);

                    if (appointment is SpaAppointment)
                        await appointments.ReleaseStaffHoldsAsync(id, ct);

                    return true;
                }, ct);

                if (cancelled)
                {
                    processed++;
                    await notifier.NotifyCancelledAsync(id, ct);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Bỏ qua lỗi từng phần tử để không làm gián đoạn các lịch hẹn hợp lệ khác trong batch
                continue;
            }
        }

        return processed;
    }

    // Trạng thái lịch hẹn trong lúc chờ khách phản hồi chi phí mới:
    // spa "Đã tiếp nhận", lưu trú "Đã xác nhận" (cùng quy ước với CostConfirmationService).
    private static AppointmentStatus AwaitingStatus(Appointment appointment) =>
        appointment is SpaAppointment ? AppointmentStatus.Received : AppointmentStatus.Confirmed;

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
