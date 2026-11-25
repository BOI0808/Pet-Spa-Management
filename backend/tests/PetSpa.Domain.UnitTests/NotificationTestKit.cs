using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Domain.UnitTests;

internal sealed record SentNotification(
    Guid RecipientUserId, NotificationType Type, Guid? AppointmentId, string Message);

internal sealed class FakeNotificationReader : IAppointmentNotificationReader
{
    public Dictionary<Guid, AppointmentNotificationTarget> Targets { get; } = [];

    public Task<AppointmentNotificationTarget?> FindAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<AppointmentNotificationTarget?>(Targets.TryGetValue(appointmentId, out var target) ? target : null);
}

internal sealed class RecordingNotificationRepository : INotificationRepository
{
    public List<SentNotification> Sent { get; } = [];

    public Task<Guid> AddAsync(
        Guid recipientUserId, NotificationType type, Guid? appointmentId, string message,
        CancellationToken ct = default)
    {
        Sent.Add(new SentNotification(recipientUserId, type, appointmentId, message));
        return Task.FromResult(Guid.NewGuid());
    }

    public Task<PagedResult<Notification>> ListByRecipientAsync(
        Guid recipientUserId, int page, int pageSize, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<int> CountUnreadAsync(Guid recipientUserId, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<Guid?> FindRecipientUserIdAsync(Guid notificationId, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task MarkReadAsync(Guid notificationId, CancellationToken ct = default) =>
        throw new NotImplementedException();
}

internal static class TestNotifier
{
    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", TimeSpan.FromHours(7), "StoreTime", "StoreTime");

    public static AppointmentNotifier Create() => Create(new FakeNotificationReader(), new RecordingNotificationRepository());

    public static AppointmentNotifier Create(FakeNotificationReader reader, RecordingNotificationRepository sent) =>
        new(reader, new NotificationService(sent), new ShopTimeZone(StoreTimeZone));
}
