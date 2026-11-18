using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Application.Services.StaffManagement;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class StaffServiceDeactivateTests
{
    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", TimeSpan.FromHours(7), "StoreTime", "StoreTime");

    private static readonly Guid StaffId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();

    private static readonly DateTimeOffset SlotStart = new(2026, 11, 17, 3, 0, 0, TimeSpan.Zero);

    private static SpaAppointment SpaOf(AppointmentStatus status) => new()
    {
        AppointmentId = Guid.NewGuid(),
        CustomerId = Guid.NewGuid(),
        PetId = Guid.NewGuid(),
        Status = status,
        SizeGroup = SizeGroup.Small,
        SlotStart = SlotStart,
        SlotEnd = SlotStart.AddMinutes(60),
        BusyUntil = SlotStart.AddMinutes(75),
        StaffRequired = 1,
    };

    #region Fakes

    private sealed class FakeStaffRepository : IStaffRepository
    {
        public bool StaffExists { get; set; } = true;
        public bool Deactivated { get; private set; }
        public List<Guid> ConfirmedAppointmentIds { get; } = [];

        public Task DeactivateAsync(Guid staffId, CancellationToken ct = default)
        {
            if (!StaffExists) throw new BusinessException(ErrorCodes.NotFound);

            Deactivated = true;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<Guid>> ListConfirmedSpaAppointmentIdsAsync(
            Guid staffId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Guid>>(ConfirmedAppointmentIds.ToList());

        public Task<Guid> CreateAsync(
            string phone, string fullName, StaffRole staffRole, string password, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeChangeRepository : IAppointmentChangeRepository
    {
        public Dictionary<Guid, AppointmentWithOwner> Stored { get; } = [];
        public List<Guid> StaffRemovedFor { get; } = [];

        public Task<AppointmentWithOwner?> FindWithOwnerAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<AppointmentWithOwner?>(Stored.TryGetValue(appointmentId, out var found) ? found : null);

        public Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default)
        {
            StaffRemovedFor.Add(appointmentId);
            return Task.CompletedTask;
        }

        public Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task ReplaceServicesAsync(
            Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed record SentNotification(
        Guid RecipientUserId, NotificationType Type, Guid? AppointmentId, string Message);

    private sealed class FakeNotificationRepository : INotificationRepository
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

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion

    private sealed class Fixture
    {
        public FakeStaffRepository Staffs { get; } = new();
        public FakeChangeRepository Changes { get; } = new();
        public FakeNotificationRepository Notifications { get; } = new();
        public StaffService Service { get; }

        public Fixture()
        {
            Service = new StaffService(
                Staffs,
                Changes,
                new FakeConcurrencyGuard(),
                new NotificationService(Notifications),
                new ShopTimeZone(StoreTimeZone));
        }

        public SpaAppointment AddAppointment(AppointmentStatus status, Guid? ownerUserId)
        {
            var spa = SpaOf(status);
            Changes.Stored[spa.AppointmentId] = new AppointmentWithOwner(spa, ownerUserId);
            Staffs.ConfirmedAppointmentIds.Add(spa.AppointmentId);
            return spa;
        }
    }

    [Fact]
    public async Task Deactivate_ConfirmedSpa_ReturnsToPendingRemovesStaffAndNotifiesCustomer()
    {
        var f = new Fixture();
        var spa = f.AddAppointment(AppointmentStatus.Confirmed, OwnerUserId);

        var returned = await f.Service.DeactivateAsync(StaffId);

        Assert.Equal(1, returned);
        Assert.True(f.Staffs.Deactivated);
        Assert.Equal(AppointmentStatus.Pending, spa.Status);
        Assert.Equal(spa.AppointmentId, Assert.Single(f.Changes.StaffRemovedFor));

        var sent = Assert.Single(f.Notifications.Sent);
        Assert.Equal(OwnerUserId, sent.RecipientUserId);
        Assert.Equal(NotificationType.StatusChanged, sent.Type);
        Assert.Equal(spa.AppointmentId, sent.AppointmentId);
        Assert.Contains("Chờ xác nhận", sent.Message);
        Assert.Contains("10:00", sent.Message);
        Assert.Contains("17/11/2026", sent.Message);
    }

    [Fact]
    public async Task Deactivate_WalkInCustomer_ReturnsToPendingWithoutNotification()
    {
        var f = new Fixture();
        var spa = f.AddAppointment(AppointmentStatus.Confirmed, ownerUserId: null);

        var returned = await f.Service.DeactivateAsync(StaffId);

        Assert.Equal(1, returned);
        Assert.Equal(AppointmentStatus.Pending, spa.Status);
        Assert.Equal(spa.AppointmentId, Assert.Single(f.Changes.StaffRemovedFor));
        Assert.Empty(f.Notifications.Sent);
    }

    [Fact]
    public async Task Deactivate_SeveralAppointments_ReturnsEachAndCountsThem()
    {
        var f = new Fixture();
        var first = f.AddAppointment(AppointmentStatus.Confirmed, OwnerUserId);
        var second = f.AddAppointment(AppointmentStatus.Confirmed, Guid.NewGuid());

        var returned = await f.Service.DeactivateAsync(StaffId);

        Assert.Equal(2, returned);
        Assert.Equal(AppointmentStatus.Pending, first.Status);
        Assert.Equal(AppointmentStatus.Pending, second.Status);
        Assert.Equal(2, f.Changes.StaffRemovedFor.Count);
        Assert.Equal(2, f.Notifications.Sent.Count);
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task Deactivate_AppointmentNoLongerConfirmed_IsSkipped(AppointmentStatus status)
    {
        var f = new Fixture();
        var spa = f.AddAppointment(status, OwnerUserId);

        var returned = await f.Service.DeactivateAsync(StaffId);

        Assert.Equal(0, returned);
        Assert.Equal(status, spa.Status);
        Assert.Empty(f.Changes.StaffRemovedFor);
        Assert.Empty(f.Notifications.Sent);
    }

    [Fact]
    public async Task Deactivate_StaffWithoutConfirmedAppointments_ReturnsZero()
    {
        var f = new Fixture();

        var returned = await f.Service.DeactivateAsync(StaffId);

        Assert.Equal(0, returned);
        Assert.True(f.Staffs.Deactivated);
        Assert.Empty(f.Notifications.Sent);
    }

    [Fact]
    public async Task Deactivate_UnknownStaff_ThrowsNotFoundAndChangesNothing()
    {
        var f = new Fixture();
        f.Staffs.StaffExists = false;
        var spa = f.AddAppointment(AppointmentStatus.Confirmed, OwnerUserId);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Service.DeactivateAsync(StaffId));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
        Assert.Empty(f.Changes.StaffRemovedFor);
        Assert.Empty(f.Notifications.Sent);
    }
}
