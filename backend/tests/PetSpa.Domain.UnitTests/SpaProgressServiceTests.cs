using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaProgressServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid PetId = Guid.NewGuid();
    private static readonly Guid BathId = Guid.NewGuid();
    private static readonly Guid TrimId = Guid.NewGuid();
    private static readonly CurrentUser SpaStaffUser = new(Guid.NewGuid(), UserRole.Staff);
    private static readonly CurrentUser ManagerUser = new(Guid.NewGuid(), UserRole.Manager);

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public SpaAppointment? Appointment { get; set; }
        public AppointmentType? Kind { get; set; } = AppointmentType.Spa;

        public Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Kind);

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetHoldMinutesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(
            DateTimeOffset since, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
            DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) =>
            throw new NotImplementedException();
    }

    private sealed class FakeQueryRepository : IAppointmentQueryRepository
    {
        public bool IsAssigned { get; set; } = true;

        public Task<bool> IsAssignedToSpaStaffAsync(Guid appointmentId, Guid staffUserId, CancellationToken ct = default) =>
            Task.FromResult(IsAssigned);

        public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
            Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<AppointmentListItem>> ListBySpaStaffUserAsync(
            Guid staffUserId, AppointmentType? type, AppointmentStatus? status, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeStaffRoleReader : IStaffRoleReader
    {
        public StaffRole? Role { get; set; }

        public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Role);
    }

    private sealed class FakePhotoRepository : IPhotoRepository
    {
        public List<AppointmentPhoto> Stored { get; } = [];
        public DateTimeOffset? LatestBefore { get; set; }

        public Task<Guid?> FindStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<AppointmentPhoto>>(Stored);

        public Task<DateTimeOffset?> FindLatestBeforeUploadedAtAsync(Guid petId, CancellationToken ct = default) =>
            Task.FromResult(LatestBefore);

        public Task<int> GetValidityDaysAsync(CancellationToken ct = default) =>
            Task.FromResult(7);

        public void Add(AppointmentPhoto photo) => throw new NotImplementedException();
    }

    private sealed class FakePhotoStorage : IPhotoStorage
    {
        public Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<string> CreateTemporaryUrlAsync(string storageKey, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeProgressRepository : ISpaProgressRepository
    {
        public bool PendingCostConfirmation { get; set; }
        public List<AppointmentService> Lines { get; } = [];
        public List<Payment> Payments { get; } = [];

        public Task<bool> HasPendingCostConfirmationAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(PendingCostConfirmation);

        public Task<AppointmentService?> FindServiceAsync(Guid appointmentId, Guid serviceId, CancellationToken ct = default) =>
            Task.FromResult(Lines.FirstOrDefault(l => l.AppointmentId == appointmentId && l.ServiceId == serviceId));

        public Task<bool> AreAllServicesDoneAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Lines.Count > 0 && Lines.All(l => l.IsDone));

        public void AddPayment(Payment payment) => Payments.Add(payment);
    }

    private sealed class FakeChangeRepository : IAppointmentChangeRepository
    {
        public List<Guid> ReleasedFor { get; } = [];

        public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default)
        {
            ReleasedFor.Add(appointmentId);
            return Task.CompletedTask;
        }

        public Task<AppointmentWithOwner?> FindWithOwnerAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task ReplaceServicesAsync(Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakePaymentAmountRepository : IPaymentAmountRepository
    {
        public SpaAmountSnapshot? Snapshot { get; set; }

        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Snapshot);

        public Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();
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

    private sealed class Fixture
    {
        public FakeAssignmentRepository Assignments { get; } = new();
        public FakeQueryRepository Query { get; } = new();
        public FakeStaffRoleReader Roles { get; } = new() { Role = StaffRole.SpaStaff };
        public FakePhotoRepository Photos { get; } = new();
        public FakeProgressRepository Progress { get; } = new();
        public FakeChangeRepository Changes { get; } = new();
        public FakePaymentAmountRepository Amounts { get; } = new();
        public FakeConcurrencyGuard Guard { get; } = new();
        public SpaProgressService Sut { get; }

        public Fixture(AppointmentStatus status)
        {
            Assignments.Appointment = new SpaAppointment
            {
                AppointmentId = AppointmentId,
                PetId = PetId,
                Status = status,
                StaffRequired = 1,
                SizeGroup = SizeGroup.Small,
            };
            Photos.LatestBefore = DateTimeOffset.UtcNow.AddDays(-1);
            Progress.Lines.Add(new AppointmentService { AppointmentId = AppointmentId, ServiceId = BathId });
            Progress.Lines.Add(new AppointmentService { AppointmentId = AppointmentId, ServiceId = TrimId });
            Amounts.Snapshot = new SpaAmountSnapshot(
                Species.Cat,
                SizeGroup.Small,
                status,
                [BathId, TrimId],
                [
                    new ServicePricing { ServiceId = BathId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100_000m },
                    new ServicePricing { ServiceId = TrimId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 50_000m },
                ]);

            var photoService = new AppointmentPhotoService(Query, Photos, new FakePhotoStorage(), Roles, Guard);
            Sut = new SpaProgressService(
                Assignments, Query, Roles, photoService, Photos, Progress, Changes, Amounts, Guard);
        }
    }

    private static AppointmentPhoto Photo(PhotoKind kind) => new()
    {
        PhotoId = Guid.NewGuid(),
        AppointmentId = AppointmentId,
        Kind = kind,
        StorageKey = "key",
        UploadedByStaffId = Guid.NewGuid(),
        UploadedAt = DateTimeOffset.UtcNow,
    };

    private static async Task AssertCodeAsync(string expected, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(expected, ex.Code);
    }

    // ---------- Quyền (BR-05, BR-16) ----------

    [Fact]
    public async Task Start_ManagerNotAssigned_Succeeds()
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;

        var status = await f.Sut.StartAsync(ManagerUser, AppointmentId);

        Assert.Equal(AppointmentStatus.InProgress, status);
    }

    [Theory]
    [InlineData(UserRole.Staff, StaffRole.SpaStaff, false)]
    [InlineData(UserRole.Staff, StaffRole.Receptionist, true)]
    [InlineData(UserRole.Customer, null, true)]
    public async Task Start_NotAllowedActor_ThrowsForbidden(UserRole role, StaffRole? staffRole, bool assigned)
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Roles.Role = staffRole;
        f.Query.IsAssigned = assigned;

        await AssertCodeAsync(ErrorCodes.Forbidden,
            () => f.Sut.StartAsync(new CurrentUser(Guid.NewGuid(), role), AppointmentId));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Start_MissingOrHotelAppointment_ThrowsNotFound(bool hotel)
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Assignments.Kind = hotel ? AppointmentType.Hotel : null;

        await AssertCodeAsync(ErrorCodes.NotFound, () => f.Sut.StartAsync(SpaStaffUser, AppointmentId));
    }

    // ---------- /start ----------

    [Fact]
    public async Task Start_Received_MovesToInProgress()
    {
        var f = new Fixture(AppointmentStatus.Received);

        var status = await f.Sut.StartAsync(SpaStaffUser, AppointmentId);

        Assert.Equal(AppointmentStatus.InProgress, status);
        Assert.Equal(AppointmentStatus.InProgress, f.Assignments.Appointment!.Status);
        Assert.Equal(AppointmentId, f.Guard.LockedAppointmentId);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task Start_WrongStatus_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var f = new Fixture(status);

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => f.Sut.StartAsync(SpaStaffUser, AppointmentId));
    }

    [Fact]
    public async Task Start_PendingCostConfirmation_ThrowsCostConfirmationPending()
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Progress.PendingCostConfirmation = true;

        await AssertCodeAsync(ErrorCodes.CostConfirmationPending, () => f.Sut.StartAsync(SpaStaffUser, AppointmentId));
        Assert.Equal(AppointmentStatus.Received, f.Assignments.Appointment!.Status);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(8)]
    public async Task Start_NoValidBeforePhoto_ThrowsPhotoRequired(int? daysAgo)
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Photos.LatestBefore = daysAgo is null ? null : DateTimeOffset.UtcNow.AddDays(-daysAgo.Value);

        await AssertCodeAsync(ErrorCodes.PhotoRequired, () => f.Sut.StartAsync(SpaStaffUser, AppointmentId));
        Assert.Equal(AppointmentStatus.Received, f.Assignments.Appointment!.Status);
    }

    // ---------- PATCH /services/{serviceId} ----------

    [Fact]
    public async Task UpdateService_Done_SetsIsDoneDoneAtAndNote()
    {
        var f = new Fixture(AppointmentStatus.InProgress);

        await f.Sut.UpdateServiceAsync(SpaStaffUser, AppointmentId, BathId, true, " Đã tắm ");

        var line = f.Progress.Lines.Single(l => l.ServiceId == BathId);
        Assert.True(line.IsDone);
        Assert.NotNull(line.DoneAt);
        Assert.Equal("Đã tắm", line.Note);
        Assert.False(f.Progress.Lines.Single(l => l.ServiceId == TrimId).IsDone);
    }

    [Fact]
    public async Task UpdateService_Undone_ClearsDoneAt()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        await f.Sut.UpdateServiceAsync(SpaStaffUser, AppointmentId, BathId, true, null);

        await f.Sut.UpdateServiceAsync(SpaStaffUser, AppointmentId, BathId, false, null);

        var line = f.Progress.Lines.Single(l => l.ServiceId == BathId);
        Assert.False(line.IsDone);
        Assert.Null(line.DoneAt);
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Completed)]
    public async Task UpdateService_NotInProgress_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var f = new Fixture(status);

        await AssertCodeAsync(ErrorCodes.InvalidTransition,
            () => f.Sut.UpdateServiceAsync(SpaStaffUser, AppointmentId, BathId, true, null));
    }

    [Fact]
    public async Task UpdateService_UnknownService_ThrowsNotFound()
    {
        var f = new Fixture(AppointmentStatus.InProgress);

        await AssertCodeAsync(ErrorCodes.NotFound,
            () => f.Sut.UpdateServiceAsync(SpaStaffUser, AppointmentId, Guid.NewGuid(), true, null));
    }

    [Fact]
    public async Task UpdateService_NotAssignedStaff_ThrowsForbidden()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Query.IsAssigned = false;

        await AssertCodeAsync(ErrorCodes.Forbidden,
            () => f.Sut.UpdateServiceAsync(SpaStaffUser, AppointmentId, BathId, true, null));
    }

    // ---------- /complete ----------

    [Fact]
    public async Task Complete_AllDoneWithAfterPhoto_CompletesReleasesHoldsAndCreatesPayment()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Progress.Lines.ForEach(l => l.IsDone = true);
        f.Photos.Stored.Add(Photo(PhotoKind.Before));
        f.Photos.Stored.Add(Photo(PhotoKind.After));

        var status = await f.Sut.CompleteAsync(SpaStaffUser, AppointmentId);

        Assert.Equal(AppointmentStatus.Completed, status);
        Assert.Equal(AppointmentStatus.Completed, f.Assignments.Appointment!.Status);
        Assert.Equal(AppointmentId, Assert.Single(f.Changes.ReleasedFor));

        var payment = Assert.Single(f.Progress.Payments);
        Assert.Equal(AppointmentId, payment.AppointmentId);
        Assert.Equal(PaymentKind.Spa, payment.Kind);
        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
        Assert.Equal(150_000m, payment.Amount);
    }

    [Fact]
    public async Task Complete_ServiceNotDone_ThrowsServicesIncomplete()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Progress.Lines[0].IsDone = true;
        f.Photos.Stored.Add(Photo(PhotoKind.After));

        await AssertCodeAsync(ErrorCodes.ServicesIncomplete, () => f.Sut.CompleteAsync(SpaStaffUser, AppointmentId));
        Assert.Equal(AppointmentStatus.InProgress, f.Assignments.Appointment!.Status);
        Assert.Empty(f.Progress.Payments);
    }

    [Fact]
    public async Task Complete_NoServices_ThrowsServicesIncomplete()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Progress.Lines.Clear();
        f.Photos.Stored.Add(Photo(PhotoKind.After));

        await AssertCodeAsync(ErrorCodes.ServicesIncomplete, () => f.Sut.CompleteAsync(SpaStaffUser, AppointmentId));
        Assert.Equal(AppointmentStatus.InProgress, f.Assignments.Appointment!.Status);
        Assert.Empty(f.Progress.Payments);
    }

    [Fact]
    public async Task Complete_NoAfterPhoto_ThrowsPhotoRequired()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Progress.Lines.ForEach(l => l.IsDone = true);
        f.Photos.Stored.Add(Photo(PhotoKind.Before));

        await AssertCodeAsync(ErrorCodes.PhotoRequired, () => f.Sut.CompleteAsync(SpaStaffUser, AppointmentId));
        Assert.Equal(AppointmentStatus.InProgress, f.Assignments.Appointment!.Status);
        Assert.Empty(f.Progress.Payments);
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Completed)]
    public async Task Complete_NotInProgress_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var f = new Fixture(status);

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => f.Sut.CompleteAsync(SpaStaffUser, AppointmentId));
    }

    // ---------- Quản lý cập nhật trực tiếp trạng thái (FR-EXE-05; BR-05, BR-06, BR-20, FR-LFC-01) ----------

    [Fact]
    public async Task UpdateService_ManagerNotAssigned_Succeeds()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;

        await f.Sut.UpdateServiceAsync(ManagerUser, AppointmentId, BathId, true, "Quản lý cập nhật");

        var line = f.Progress.Lines.Single(l => l.ServiceId == BathId);
        Assert.True(line.IsDone);
        Assert.Equal("Quản lý cập nhật", line.Note);
    }

    [Fact]
    public async Task Complete_ManagerNotAssigned_CompletesAndCreatesPayment()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;
        f.Progress.Lines.ForEach(l => l.IsDone = true);
        f.Photos.Stored.Add(Photo(PhotoKind.After));

        var status = await f.Sut.CompleteAsync(ManagerUser, AppointmentId);

        Assert.Equal(AppointmentStatus.Completed, status);
        var payment = Assert.Single(f.Progress.Payments);
        Assert.Equal(PaymentKind.Spa, payment.Kind);
    }

    [Fact]
    public async Task Start_ManagerNoBeforePhoto_ThrowsPhotoRequired()
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;
        f.Photos.LatestBefore = null;

        await AssertCodeAsync(ErrorCodes.PhotoRequired, () => f.Sut.StartAsync(ManagerUser, AppointmentId));
        Assert.Equal(AppointmentStatus.Received, f.Assignments.Appointment!.Status);
    }

    [Fact]
    public async Task Complete_ManagerServiceNotDone_ThrowsServicesIncomplete()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;
        f.Progress.Lines[0].IsDone = true;
        f.Photos.Stored.Add(Photo(PhotoKind.After));

        await AssertCodeAsync(ErrorCodes.ServicesIncomplete, () => f.Sut.CompleteAsync(ManagerUser, AppointmentId));
        Assert.Equal(AppointmentStatus.InProgress, f.Assignments.Appointment!.Status);
        Assert.Empty(f.Progress.Payments);
    }

    [Fact]
    public async Task Complete_ManagerNoAfterPhoto_ThrowsPhotoRequired()
    {
        var f = new Fixture(AppointmentStatus.InProgress);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;
        f.Progress.Lines.ForEach(l => l.IsDone = true);
        f.Photos.Stored.Add(Photo(PhotoKind.Before));

        await AssertCodeAsync(ErrorCodes.PhotoRequired, () => f.Sut.CompleteAsync(ManagerUser, AppointmentId));
        Assert.Equal(AppointmentStatus.InProgress, f.Assignments.Appointment!.Status);
        Assert.Empty(f.Progress.Payments);
    }

    [Fact]
    public async Task Start_ManagerFromConfirmed_ThrowsInvalidTransition()
    {
        var f = new Fixture(AppointmentStatus.Confirmed);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => f.Sut.StartAsync(ManagerUser, AppointmentId));
        Assert.Equal(AppointmentStatus.Confirmed, f.Assignments.Appointment!.Status);
    }

    [Fact]
    public async Task Complete_ManagerFromReceived_ThrowsInvalidTransition()
    {
        var f = new Fixture(AppointmentStatus.Received);
        f.Query.IsAssigned = false;
        f.Roles.Role = null;

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => f.Sut.CompleteAsync(ManagerUser, AppointmentId));
        Assert.Equal(AppointmentStatus.Received, f.Assignments.Appointment!.Status);
    }
}
