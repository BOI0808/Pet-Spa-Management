using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentPhotoServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid PetId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private static readonly CurrentUser SpaStaffUser = new(Guid.NewGuid(), UserRole.Staff);
    private static readonly CurrentUser CustomerUser = new(OwnerUserId, UserRole.Customer);
    private static readonly CurrentUser OtherCustomerUser = new(Guid.NewGuid(), UserRole.Customer);
    private static readonly CurrentUser ManagerUser = new(Guid.NewGuid(), UserRole.Manager);

    private sealed class FakeQueryRepository : IAppointmentQueryRepository
    {
        public AppointmentDetailData? Detail { get; set; }
        public bool IsAssigned { get; set; }

        public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Detail);

        public Task<bool> IsAssignedToSpaStaffAsync(Guid appointmentId, Guid staffUserId, CancellationToken ct = default) =>
            Task.FromResult(IsAssigned);

        public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
            Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<AppointmentListItem>> ListBySpaStaffUserAsync(
            Guid staffUserId, AppointmentType? type, AppointmentStatus? status, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakePhotoRepository : IPhotoRepository
    {
        public Guid? StaffId { get; set; } = Guid.NewGuid();
        public List<AppointmentPhoto> Stored { get; } = [];
        public List<AppointmentPhoto> Added { get; } = [];
        public DateTimeOffset? LatestBefore { get; set; }
        public int ValidityDays { get; set; } = 7;

        public Task<Guid?> FindStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(StaffId);

        public Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<AppointmentPhoto>>(Stored);

        public Task<DateTimeOffset?> FindLatestBeforeUploadedAtAsync(Guid petId, CancellationToken ct = default) =>
            Task.FromResult(LatestBefore);

        public Task<int> GetValidityDaysAsync(CancellationToken ct = default) =>
            Task.FromResult(ValidityDays);

        public void Add(AppointmentPhoto photo) => Added.Add(photo);
    }

    private sealed class FakePhotoStorage : IPhotoStorage
    {
        public List<(string Key, string ContentType)> Uploads { get; } = [];

        public Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default)
        {
            Uploads.Add((storageKey, contentType));
            return Task.CompletedTask;
        }

        public Task<string> CreateTemporaryUrlAsync(string storageKey, CancellationToken ct = default) =>
            Task.FromResult($"https://storage.test/{storageKey}?token=abc");
    }

    private sealed class FakeStaffRoleReader : IStaffRoleReader
    {
        public StaffRole? Role { get; set; }

        public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Role);
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Guid? LockedAppointmentId { get; private set; }

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            LockedAppointmentId = appointmentId;
            return Task.CompletedTask;
        }
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    private static AppointmentDetailData Detail(AppointmentStatus status) =>
        new(new AppointmentListItem(
                AppointmentId, AppointmentType.Spa, Guid.NewGuid(), PetId, "Khách", "Mimi",
                status, null, null, SizeGroup.Small, null,
                null, null, null, null, null, null, null,
                DateTimeOffset.UtcNow, DateTimeOffset.UtcNow),
            OwnerUserId, [], [], null);

    private sealed class Fixture
    {
        public FakeQueryRepository Query { get; } = new();
        public FakePhotoRepository Photos { get; } = new();
        public FakePhotoStorage Storage { get; } = new();
        public FakeStaffRoleReader Roles { get; } = new() { Role = StaffRole.SpaStaff };
        public FakeConcurrencyGuard Guard { get; } = new();
        public AppointmentPhotoService Sut { get; }

        public Fixture(AppointmentStatus status = AppointmentStatus.Received, bool assigned = true)
        {
            Query.Detail = Detail(status);
            Query.IsAssigned = assigned;
            Sut = new AppointmentPhotoService(Query, Photos, Storage, Roles, Guard);
        }
    }

    private static AppointmentPhoto StoredPhoto(PhotoKind kind) => new()
    {
        PhotoId = Guid.NewGuid(),
        AppointmentId = AppointmentId,
        Kind = kind,
        StorageKey = $"appointments/{AppointmentId}/{Guid.NewGuid()}",
        UploadedByStaffId = Guid.NewGuid(),
        UploadedAt = DateTimeOffset.UtcNow,
    };

    // ---------- UploadAsync ----------

    [Fact]
    public async Task UploadAsync_BeforePhotoWhenReceived_StoresFileAndRecord()
    {
        var f = new Fixture(AppointmentStatus.Received);
        using var content = new MemoryStream(new byte[] { 1, 2, 3 });

        var photoId = await f.Sut.UploadAsync(SpaStaffUser, AppointmentId, PhotoKind.Before, content, "image/jpeg");

        var photo = Assert.Single(f.Photos.Added);
        Assert.Equal(photoId, photo.PhotoId);
        Assert.Equal(AppointmentId, photo.AppointmentId);
        Assert.Equal(PhotoKind.Before, photo.Kind);
        Assert.Equal(f.Photos.StaffId, photo.UploadedByStaffId);
        Assert.StartsWith($"appointments/{AppointmentId}/", photo.StorageKey);

        var upload = Assert.Single(f.Storage.Uploads);
        Assert.Equal(photo.StorageKey, upload.Key);
        Assert.Equal("image/jpeg", upload.ContentType);
        Assert.Equal(AppointmentId, f.Guard.LockedAppointmentId);
    }

    [Fact]
    public async Task UploadAsync_AfterPhotoWhenInProgress_StoresRecord()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        using var content = new MemoryStream(new byte[] { 1 });

        await f.Sut.UploadAsync(SpaStaffUser, AppointmentId, PhotoKind.After, content, "image/png");

        var photo = Assert.Single(f.Photos.Added);
        Assert.Equal(PhotoKind.After, photo.Kind);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed, PhotoKind.Before)]
    [InlineData(AppointmentStatus.InProgress, PhotoKind.Before)]
    [InlineData(AppointmentStatus.Received, PhotoKind.After)]
    [InlineData(AppointmentStatus.Completed, PhotoKind.After)]
    public async Task UploadAsync_WhenStatusDoesNotMatchKind_ThrowsInvalidTransitionAndStoresNothing(
        AppointmentStatus status, PhotoKind kind)
    {
        var f = new Fixture(status);
        using var content = new MemoryStream(new byte[] { 1 });

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.UploadAsync(SpaStaffUser, AppointmentId, kind, content, "image/jpeg"));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Empty(f.Storage.Uploads);
        Assert.Empty(f.Photos.Added);
    }

    [Fact]
    public async Task UploadAsync_WhenNotAssigned_ThrowsForbiddenAndStoresNothing()
    {
        var f = new Fixture(AppointmentStatus.Received, assigned: false);
        using var content = new MemoryStream(new byte[] { 1 });

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.UploadAsync(SpaStaffUser, AppointmentId, PhotoKind.Before, content, "image/jpeg"));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
        Assert.Empty(f.Storage.Uploads);
        Assert.Empty(f.Photos.Added);
    }

    [Fact]
    public async Task UploadAsync_WhenReceptionist_ThrowsForbidden()
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Roles.Role = StaffRole.Receptionist;
        using var content = new MemoryStream(new byte[] { 1 });

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.UploadAsync(SpaStaffUser, AppointmentId, PhotoKind.Before, content, "image/jpeg"));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
        Assert.Empty(f.Storage.Uploads);
    }

    [Fact]
    public async Task UploadAsync_WhenCustomer_ThrowsForbidden()
    {
        var f = new Fixture(AppointmentStatus.Received);
        using var content = new MemoryStream(new byte[] { 1 });

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.UploadAsync(CustomerUser, AppointmentId, PhotoKind.Before, content, "image/jpeg"));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
        Assert.Empty(f.Storage.Uploads);
    }

    [Fact]
    public async Task UploadAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        f.Query.Detail = null;
        using var content = new MemoryStream(new byte[] { 1 });

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.UploadAsync(SpaStaffUser, AppointmentId, PhotoKind.Before, content, "image/jpeg"));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
        Assert.Empty(f.Storage.Uploads);
    }

    // ---------- ListAsync ----------

    [Fact]
    public async Task ListAsync_WhenCustomerOwnsAppointment_ReturnsPhotosWithTemporaryUrl()
    {
        var f = new Fixture(AppointmentStatus.Completed);
        var stored = StoredPhoto(PhotoKind.Before);
        f.Photos.Stored.Add(stored);

        var result = await f.Sut.ListAsync(CustomerUser, AppointmentId);

        var view = Assert.Single(result);
        Assert.Equal(stored.PhotoId, view.PhotoId);
        Assert.Equal(PhotoKind.Before, view.Kind);
        Assert.StartsWith("https://storage.test/", view.Url);
        Assert.Equal(stored.UploadedAt, view.UploadedAt);
    }

    [Fact]
    public async Task ListAsync_WhenCustomerDoesNotOwnAppointment_ThrowsForbidden()
    {
        var f = new Fixture(AppointmentStatus.Completed);
        f.Photos.Stored.Add(StoredPhoto(PhotoKind.Before));

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.ListAsync(OtherCustomerUser, AppointmentId));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WhenManager_ReturnsPhotos()
    {
        var f = new Fixture(AppointmentStatus.Completed);
        f.Photos.Stored.Add(StoredPhoto(PhotoKind.After));

        var result = await f.Sut.ListAsync(ManagerUser, AppointmentId);

        Assert.Single(result);
    }

    [Fact]
    public async Task ListAsync_WhenAssignedSpaStaff_ReturnsPhotos()
    {
        var f = new Fixture(AppointmentStatus.InProgress, assigned: true);
        f.Photos.Stored.Add(StoredPhoto(PhotoKind.Before));

        var result = await f.Sut.ListAsync(SpaStaffUser, AppointmentId);

        Assert.Single(result);
    }

    [Fact]
    public async Task ListAsync_WhenSpaStaffNotAssigned_ThrowsForbidden()
    {
        var f = new Fixture(AppointmentStatus.InProgress, assigned: false);

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.ListAsync(SpaStaffUser, AppointmentId));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WhenReceptionist_ThrowsForbidden()
    {
        var f = new Fixture(AppointmentStatus.Completed);
        f.Roles.Role = StaffRole.Receptionist;

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.ListAsync(SpaStaffUser, AppointmentId));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        f.Query.Detail = null;

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Sut.ListAsync(ManagerUser, AppointmentId));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    // ---------- EnsureValidBeforePhotoAsync ----------

    [Fact]
    public async Task EnsureValidBeforePhotoAsync_WhenLatestWithinValidity_DoesNotThrow()
    {
        var f = new Fixture();
        f.Photos.LatestBefore = DateTimeOffset.UtcNow.AddDays(-3);

        await f.Sut.EnsureValidBeforePhotoAsync(PetId);
    }

    [Fact]
    public async Task EnsureValidBeforePhotoAsync_WhenLatestOlderThanValidity_ThrowsPhotoRequired()
    {
        var f = new Fixture();
        f.Photos.LatestBefore = DateTimeOffset.UtcNow.AddDays(-8);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.EnsureValidBeforePhotoAsync(PetId));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }

    [Fact]
    public async Task EnsureValidBeforePhotoAsync_WhenNoPhoto_ThrowsPhotoRequired()
    {
        var f = new Fixture();
        f.Photos.LatestBefore = null;

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.EnsureValidBeforePhotoAsync(PetId));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }

    [Fact]
    public async Task EnsureValidBeforePhotoAsync_UsesConfiguredValidityDays()
    {
        var f = new Fixture();
        f.Photos.LatestBefore = DateTimeOffset.UtcNow.AddDays(-3);
        f.Photos.ValidityDays = 2;

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.EnsureValidBeforePhotoAsync(PetId));

        Assert.Equal(ErrorCodes.PhotoRequired, ex.Code);
    }
}
