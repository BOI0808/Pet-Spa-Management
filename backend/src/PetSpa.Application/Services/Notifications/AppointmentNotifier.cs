using System.Globalization;
using Microsoft.Extensions.Logging;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Notifications;

public sealed class AppointmentNotifier(
    IAppointmentNotificationReader reader,
    NotificationService notifications,
    ShopTimeZone shopTimeZone,
    ILogger<AppointmentNotifier> logger)
{
    public Task NotifyBookingReceivedAsync(Guid appointmentId, CancellationToken ct = default) =>
        SafeNotifyAsync(appointmentId, nameof(NotifyBookingReceivedAsync), async () =>
        {
            if (await reader.FindAsync(appointmentId, ct) is not { } target) return;

            await SendToCustomerAsync(
                target, NotificationType.BookingReceived, appointmentId,
                $"Yêu cầu đặt {Subject(target)} đã được ghi nhận ở trạng thái Chờ xác nhận. Cửa hàng sẽ xác nhận sớm.", ct);
        });

    public Task NotifyConfirmedAsync(Guid appointmentId, decimal? amount, CancellationToken ct = default) =>
        SafeNotifyAsync(appointmentId, nameof(NotifyConfirmedAsync), async () =>
        {
            if (await reader.FindAsync(appointmentId, ct) is not { } target) return;

            var amountText = amount is { } value ? $" Số tiền: {Money(value)}." : string.Empty;
            await SendToCustomerAsync(
                target, NotificationType.ConfirmedAssigned, appointmentId,
                $"{Capitalize(Subject(target))} đã được xác nhận.{amountText}", ct);

            await SendToStaffAsync(
                target, NotificationType.ConfirmedAssigned, appointmentId,
                $"Bạn được phân công {Subject(target)}.", ct);
        });

    public Task NotifyStatusChangedAsync(
        Guid appointmentId, AppointmentStatus status, CancellationToken ct = default) =>
        SafeNotifyAsync(appointmentId, nameof(NotifyStatusChangedAsync), async () =>
        {
            if (await reader.FindAsync(appointmentId, ct) is not { } target) return;

            await SendToCustomerAsync(
                target, NotificationType.StatusChanged, appointmentId,
                $"{Capitalize(Subject(target))} đã chuyển sang trạng thái {StatusText(status)}.", ct);
        });

    public Task NotifyCancelledAsync(Guid appointmentId, CancellationToken ct = default) =>
        SafeNotifyAsync(appointmentId, nameof(NotifyCancelledAsync), async () =>
        {
            if (await reader.FindAsync(appointmentId, ct) is not { } target) return;
            if (target.CancelReason is not { } reason) return;

            var message = $"{Capitalize(Subject(target))} đã bị hủy. Lý do: {ReasonText(reason)}.";
            await SendToCustomerAsync(target, NotificationType.Cancelled, appointmentId, message, ct);
            await SendToStaffAsync(target, NotificationType.Cancelled, appointmentId, message, ct);
        });

    public Task NotifyPaymentRecordedAsync(
        Guid appointmentId, PaymentKind kind, decimal amount, CancellationToken ct = default) =>
        SafeNotifyAsync(appointmentId, nameof(NotifyPaymentRecordedAsync), async () =>
        {
            if (await reader.FindAsync(appointmentId, ct) is not { } target) return;

            await SendToCustomerAsync(
                target, NotificationType.PaymentRecorded, appointmentId,
                $"Đã ghi nhận thanh toán {PaymentKindText(kind)} {Money(amount)} cho {Subject(target)}.", ct);
        });

    public Task NotifyCostConfirmationAsync(
        Guid appointmentId, decimal actualWeightKg, decimal newAmount, DateTimeOffset expiresAt,
        CancellationToken ct = default) =>
        SafeNotifyAsync(appointmentId, nameof(NotifyCostConfirmationAsync), async () =>
        {
            if (await reader.FindAsync(appointmentId, ct) is not { } target) return;

            var weight = actualWeightKg.ToString("0.##", CultureInfo.InvariantCulture);
            var (day, time) = shopTimeZone.ToLocal(expiresAt);
            var message = FormattableString.Invariant(
                $"Cân nặng thực tế của {target.PetName} là {weight} kg, chuyển sang nhóm kích cỡ lớn hơn. Chi phí mới của {Subject(target)} là {Money(newAmount)}. Vui lòng xác nhận hoặc từ chối trước {time:HH:mm} ngày {day:dd/MM/yyyy}, quá hạn lịch hẹn sẽ tự động bị hủy.");

            await SendToCustomerAsync(target, NotificationType.CostConfirmation, appointmentId, message, ct);
        });

    private async Task SafeNotifyAsync(Guid appointmentId, string eventName, Func<Task> work)
    {
        try
        {
            await work();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Gửi thông báo {EventName} thất bại cho lịch hẹn {AppointmentId}", eventName, appointmentId);
        }
    }

    private async Task SendToCustomerAsync(
        AppointmentNotificationTarget target, NotificationType type, Guid appointmentId, string message,
        CancellationToken ct)
    {
        if (target.CustomerUserId is not { } userId) return;

        await notifications.CreateAsync(userId, type, appointmentId, message, ct);
    }

    private async Task SendToStaffAsync(
        AppointmentNotificationTarget target, NotificationType type, Guid appointmentId, string message,
        CancellationToken ct)
    {
        foreach (var userId in target.StaffUserIds)
            await notifications.CreateAsync(userId, type, appointmentId, message, ct);
    }

    private string Subject(AppointmentNotificationTarget target)
    {
        var (day, time) = shopTimeZone.ToLocal(target.StartAt);

        return target.Type == AppointmentType.Spa
            ? FormattableString.Invariant(
                $"lịch hẹn spa của {target.PetName} lúc {time:HH:mm} ngày {day:dd/MM/yyyy}")
            : FormattableString.Invariant(
                $"lịch lưu trú của {target.PetName} nhận phòng lúc {time:HH:mm} ngày {day:dd/MM/yyyy}");
    }

    private static string Capitalize(string text) =>
        string.IsNullOrEmpty(text) ? text : char.ToUpperInvariant(text[0]) + text[1..];

    private static string Money(decimal amount) =>
        amount.ToString("N0", CultureInfo.InvariantCulture).Replace(',', '.') + "đ";

    private static string StatusText(AppointmentStatus status) => status switch
    {
        AppointmentStatus.Received => "Đã tiếp nhận",
        AppointmentStatus.InProgress => "Đang thực hiện",
        AppointmentStatus.InStay => "Đang lưu trú",
        AppointmentStatus.Completed => "Hoàn tất",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    private static string ReasonText(CancelReason reason) => reason switch
    {
        CancelReason.CustomerCancelled => "khách hàng chủ động hủy",
        CancelReason.StoreUnable => "cửa hàng không thể đáp ứng",
        CancelReason.CustomerBeyondDeadline => "khách hàng yêu cầu hủy ngoài hạn tự phục vụ",
        CancelReason.NoShow => "khách hàng không đến trong thời gian giữ chỗ",
        CancelReason.CostNotConfirmed => "khách hàng từ chối hoặc không phản hồi chi phí mới",
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, null),
    };

    private static string PaymentKindText(PaymentKind kind) => kind switch
    {
        PaymentKind.Spa => "tiền dịch vụ spa",
        PaymentKind.Stay => "tiền lưu trú",
        PaymentKind.LateFee => "phí phạt trả muộn",
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, null),
    };
}
