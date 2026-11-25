using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Enums;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentNotifierTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid CustomerUserId = Guid.NewGuid();
    private static readonly Guid StaffUserId = Guid.NewGuid();

    private static readonly DateTimeOffset Start = new(2026, 11, 17, 3, 0, 0, TimeSpan.Zero);

    private sealed class Fixture
    {
        public FakeNotificationReader Reader { get; } = new();
        public RecordingNotificationRepository Sent { get; } = new();
        public AppointmentNotifier Notifier { get; }

        public Fixture() => Notifier = TestNotifier.Create(Reader, Sent);

        public void AddSpa(
            Guid? customerUserId = null, bool walkIn = false, CancelReason? reason = null, params Guid[] staffUserIds) =>
            Reader.Targets[AppointmentId] = new AppointmentNotificationTarget(
                AppointmentType.Spa, walkIn ? null : customerUserId ?? CustomerUserId, "Mimi", Start, reason, staffUserIds);

        public void AddHotel(bool walkIn = false, CancelReason? reason = null) =>
            Reader.Targets[AppointmentId] = new AppointmentNotificationTarget(
                AppointmentType.Hotel, walkIn ? null : CustomerUserId, "Mimi", Start, reason, []);
    }

    [Fact]
    public async Task BookingReceived_Spa_NotifiesCustomer()
    {
        var f = new Fixture();
        f.AddSpa();

        await f.Notifier.NotifyBookingReceivedAsync(AppointmentId);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Equal(CustomerUserId, sent.RecipientUserId);
        Assert.Equal(NotificationType.BookingReceived, sent.Type);
        Assert.Equal(AppointmentId, sent.AppointmentId);
        Assert.Contains("lịch hẹn spa của Mimi lúc 10:00 ngày 17/11/2026", sent.Message);
        Assert.Contains("Chờ xác nhận", sent.Message);
    }

    [Fact]
    public async Task BookingReceived_Hotel_MentionsCheckIn()
    {
        var f = new Fixture();
        f.AddHotel();

        await f.Notifier.NotifyBookingReceivedAsync(AppointmentId);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Contains("lịch lưu trú của Mimi nhận phòng lúc 10:00 ngày 17/11/2026", sent.Message);
    }

    [Fact]
    public async Task BookingReceived_WalkInCustomer_SendsNothing()
    {
        var f = new Fixture();
        f.AddSpa(walkIn: true);

        await f.Notifier.NotifyBookingReceivedAsync(AppointmentId);

        Assert.Empty(f.Sent.Sent);
    }

    [Fact]
    public async Task AnyEvent_UnknownAppointment_SendsNothing()
    {
        var f = new Fixture();

        await f.Notifier.NotifyBookingReceivedAsync(AppointmentId);
        await f.Notifier.NotifyConfirmedAsync(AppointmentId, 100_000m);
        await f.Notifier.NotifyCancelledAsync(AppointmentId);

        Assert.Empty(f.Sent.Sent);
    }

    [Fact]
    public async Task Confirmed_Spa_NotifiesCustomerWithAmountAndAssignedStaff()
    {
        var f = new Fixture();
        f.AddSpa(staffUserIds: [StaffUserId]);

        await f.Notifier.NotifyConfirmedAsync(AppointmentId, 1_270_000m);

        Assert.Equal(2, f.Sent.Sent.Count);

        Assert.Equal(CustomerUserId, f.Sent.Sent[0].RecipientUserId);
        Assert.Equal(NotificationType.ConfirmedAssigned, f.Sent.Sent[0].Type);
        Assert.Contains("đã được xác nhận", f.Sent.Sent[0].Message);
        Assert.Contains("1.270.000đ", f.Sent.Sent[0].Message);

        Assert.Equal(StaffUserId, f.Sent.Sent[1].RecipientUserId);
        Assert.Equal(NotificationType.ConfirmedAssigned, f.Sent.Sent[1].Type);
        Assert.Contains("Bạn được phân công", f.Sent.Sent[1].Message);
    }

    [Fact]
    public async Task Confirmed_Hotel_NotifiesCustomerWithoutAmount()
    {
        var f = new Fixture();
        f.AddHotel();

        await f.Notifier.NotifyConfirmedAsync(AppointmentId, null);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Equal(CustomerUserId, sent.RecipientUserId);
        Assert.Contains("đã được xác nhận", sent.Message);
        Assert.DoesNotContain("Số tiền", sent.Message);
    }

    [Fact]
    public async Task Confirmed_WalkInSpa_NotifiesOnlyStaff()
    {
        var f = new Fixture();
        f.AddSpa(walkIn: true, staffUserIds: [StaffUserId]);

        await f.Notifier.NotifyConfirmedAsync(AppointmentId, 100_000m);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Equal(StaffUserId, sent.RecipientUserId);
    }

    [Theory]
    [InlineData(AppointmentStatus.Received, "Đã tiếp nhận")]
    [InlineData(AppointmentStatus.InProgress, "Đang thực hiện")]
    [InlineData(AppointmentStatus.InStay, "Đang lưu trú")]
    [InlineData(AppointmentStatus.Completed, "Hoàn tất")]
    public async Task StatusChanged_NotifiesCustomerWithStatusName(AppointmentStatus status, string expectedText)
    {
        var f = new Fixture();
        f.AddSpa(staffUserIds: [StaffUserId]);

        await f.Notifier.NotifyStatusChangedAsync(AppointmentId, status);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Equal(CustomerUserId, sent.RecipientUserId);
        Assert.Equal(NotificationType.StatusChanged, sent.Type);
        Assert.Contains(expectedText, sent.Message);
    }

    [Fact]
    public async Task StatusChanged_StatusWithoutNotification_SendsNothingAndDoesNotThrow()
    {
        var f = new Fixture();
        f.AddSpa();

        await f.Notifier.NotifyStatusChangedAsync(AppointmentId, AppointmentStatus.Pending);

        Assert.Empty(f.Sent.Sent);
    }

    [Fact]
    public async Task AnyEvent_WhenReaderThrows_DoesNotThrow()
    {
        var reader = new ThrowingNotificationReader();
        var sent = new RecordingNotificationRepository();
        var notifier = new AppointmentNotifier(
            reader, new NotificationService(sent), new ShopTimeZone(TimeZoneInfo.Utc),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<AppointmentNotifier>.Instance);

        await notifier.NotifyBookingReceivedAsync(AppointmentId);

        Assert.Empty(sent.Sent);
    }

    [Fact]
    public async Task AnyEvent_WhenRepositoryThrows_DoesNotThrow()
    {
        var reader = new FakeNotificationReader();
        reader.Targets[AppointmentId] = new AppointmentNotificationTarget(
            AppointmentType.Spa, CustomerUserId, "Mimi", Start, null, []);
        var notifier = new AppointmentNotifier(
            reader, new NotificationService(new ThrowingNotificationRepository()), new ShopTimeZone(TimeZoneInfo.Utc),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<AppointmentNotifier>.Instance);

        await notifier.NotifyPaymentRecordedAsync(AppointmentId, PaymentKind.Spa, 100_000m);
    }

    [Fact]
    public async Task AnyEvent_WhenOperationCancelled_Rethrows()
    {
        var notifier = new AppointmentNotifier(
            new CancellingNotificationReader(), new NotificationService(new RecordingNotificationRepository()),
            new ShopTimeZone(TimeZoneInfo.Utc),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<AppointmentNotifier>.Instance);

        await Assert.ThrowsAsync<OperationCanceledException>(() => notifier.NotifyBookingReceivedAsync(AppointmentId));
    }

    private sealed class ThrowingNotificationReader : IAppointmentNotificationReader
    {
        public Task<AppointmentNotificationTarget?> FindAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new InvalidOperationException("DB connection lost");
    }

    private sealed class CancellingNotificationReader : IAppointmentNotificationReader
    {
        public Task<AppointmentNotificationTarget?> FindAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new OperationCanceledException();
    }

    private sealed class ThrowingNotificationRepository : INotificationRepository
    {
        public Task<Guid> AddAsync(
            Guid recipientUserId, NotificationType type, Guid? appointmentId, string message,
            CancellationToken ct = default) =>
            throw new InvalidOperationException("Insert failed");

        public Task<PagedResult<PetSpa.Domain.Entities.Notification>> ListByRecipientAsync(
            Guid recipientUserId, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> CountUnreadAsync(Guid recipientUserId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Guid?> FindRecipientUserIdAsync(Guid notificationId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task MarkReadAsync(Guid notificationId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    [Fact]
    public async Task Cancelled_NotifiesCustomerAndStaffWithReason()
    {
        var f = new Fixture();
        f.AddSpa(reason: CancelReason.StoreUnable, staffUserIds: [StaffUserId]);

        await f.Notifier.NotifyCancelledAsync(AppointmentId);

        Assert.Equal(2, f.Sent.Sent.Count);
        Assert.Equal(CustomerUserId, f.Sent.Sent[0].RecipientUserId);
        Assert.Equal(StaffUserId, f.Sent.Sent[1].RecipientUserId);
        Assert.All(f.Sent.Sent, s =>
        {
            Assert.Equal(NotificationType.Cancelled, s.Type);
            Assert.Contains("đã bị hủy", s.Message);
            Assert.Contains("cửa hàng không thể đáp ứng", s.Message);
        });
    }

    [Theory]
    [InlineData(CancelReason.CustomerCancelled, "khách hàng chủ động hủy")]
    [InlineData(CancelReason.StoreUnable, "cửa hàng không thể đáp ứng")]
    [InlineData(CancelReason.CustomerBeyondDeadline, "ngoài hạn tự phục vụ")]
    [InlineData(CancelReason.NoShow, "không đến trong thời gian giữ chỗ")]
    [InlineData(CancelReason.CostNotConfirmed, "chi phí mới")]
    public async Task Cancelled_EveryReasonHasText(CancelReason reason, string expectedText)
    {
        var f = new Fixture();
        f.AddHotel(reason: reason);

        await f.Notifier.NotifyCancelledAsync(AppointmentId);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Contains(expectedText, sent.Message);
    }

    [Fact]
    public async Task Cancelled_AppointmentWithoutCancelReason_SendsNothing()
    {
        var f = new Fixture();
        f.AddSpa(reason: null, staffUserIds: [StaffUserId]);

        await f.Notifier.NotifyCancelledAsync(AppointmentId);

        Assert.Empty(f.Sent.Sent);
    }

    [Theory]
    [InlineData(PaymentKind.Spa, "tiền dịch vụ spa")]
    [InlineData(PaymentKind.Stay, "tiền lưu trú")]
    [InlineData(PaymentKind.LateFee, "phí phạt trả muộn")]
    public async Task PaymentRecorded_NotifiesCustomerWithKindAndAmount(PaymentKind kind, string expectedText)
    {
        var f = new Fixture();
        f.AddSpa(staffUserIds: [StaffUserId]);

        await f.Notifier.NotifyPaymentRecordedAsync(AppointmentId, kind, 270_000m);

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Equal(CustomerUserId, sent.RecipientUserId);
        Assert.Equal(NotificationType.PaymentRecorded, sent.Type);
        Assert.Contains(expectedText, sent.Message);
        Assert.Contains("270.000đ", sent.Message);
    }

    [Fact]
    public async Task CostConfirmation_NotifiesCustomerWithWeightNewAmountAndDeadline()
    {
        var f = new Fixture();
        f.AddSpa();

        await f.Notifier.NotifyCostConfirmationAsync(
            AppointmentId, 3.6m, 320_000m, new DateTimeOffset(2026, 11, 17, 3, 30, 0, TimeSpan.Zero));

        var sent = Assert.Single(f.Sent.Sent);
        Assert.Equal(CustomerUserId, sent.RecipientUserId);
        Assert.Equal(NotificationType.CostConfirmation, sent.Type);
        Assert.Contains("3.6 kg", sent.Message);
        Assert.Contains("320.000đ", sent.Message);
        Assert.Contains("10:30 ngày 17/11/2026", sent.Message);
    }

    [Fact]
    public async Task EveryMessage_FitsNotificationColumn()
    {
        var f = new Fixture();
        f.Reader.Targets[AppointmentId] = new AppointmentNotificationTarget(
            AppointmentType.Hotel, CustomerUserId, new string('A', 100), Start, CancelReason.CustomerBeyondDeadline, []);

        await f.Notifier.NotifyBookingReceivedAsync(AppointmentId);
        await f.Notifier.NotifyCancelledAsync(AppointmentId);
        await f.Notifier.NotifyCostConfirmationAsync(AppointmentId, 12.5m, 9_999_999m, Start);

        Assert.All(f.Sent.Sent, s => Assert.True(s.Message.Length <= 500));
    }
}
