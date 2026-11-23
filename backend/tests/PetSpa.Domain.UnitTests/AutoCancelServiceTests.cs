using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AutoCancelServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();

    private sealed class FakeAutoCancelRepository : IAutoCancelRepository
    {
        public List<Guid> NoShowIds { get; } = [];
        public List<Guid> ExpiredCostIds { get; } = [];

        public Task<IReadOnlyList<Guid>> ListNoShowCandidateIdsAsync(
            DateTimeOffset cutoff, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Guid>>(NoShowIds.ToList());

        public Task<IReadOnlyList<Guid>> ListExpiredCostConfirmationAppointmentIdsAsync(
            DateTimeOffset now, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Guid>>(ExpiredCostIds.ToList());
    }

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public Task<int> GetHoldMinutesAsync(CancellationToken ct = default) => Task.FromResult(15);

        public Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(
            DateTimeOffset since, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
            DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) =>
            throw new NotImplementedException();
    }

    private sealed class FakeChangeRepository : IAppointmentChangeRepository
    {
        public Dictionary<Guid, Appointment> Stored { get; } = [];
        public List<Guid> StaffReleased { get; } = [];

        public Task<AppointmentWithOwner?> FindWithOwnerAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<AppointmentWithOwner?>(
                Stored.TryGetValue(appointmentId, out var appointment) ? new AppointmentWithOwner(appointment, null) : null);

        public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default)
        {
            StaffReleased.Add(appointmentId);
            return Task.CompletedTask;
        }

        public Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task ReplaceServicesAsync(Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Guid? ThrowOnId { get; set; }
        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            if (ThrowOnId == appointmentId)
                throw new InvalidOperationException("Simulated concurrency failure");
            return Task.CompletedTask;
        }
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class Fixture
    {
        public FakeAutoCancelRepository Candidates { get; } = new();
        public FakeChangeRepository Changes { get; } = new();
        public FakeCostConfirmationRepository Confirmations { get; } = new();
        public FakeConcurrencyGuard Guard { get; } = new();
        public AutoCancelService Service { get; }

        public Fixture() =>
            Service = new AutoCancelService(
                Candidates, new FakeAssignmentRepository(), Changes, Confirmations, Guard);
    }

    private static SpaAppointment Spa(AppointmentStatus status, DateTimeOffset slotStart) => new()
    {
        AppointmentId = AppointmentId,
        Status = status,
        SizeGroup = SizeGroup.Small,
        SlotStart = slotStart,
        StaffRequired = 1,
    };

    private static HotelAppointment Stay(AppointmentStatus status, DateTimeOffset plannedCheckIn) => new()
    {
        AppointmentId = AppointmentId,
        Status = status,
        SizeGroup = SizeGroup.Small,
        PlannedCheckIn = plannedCheckIn,
    };

    private static CostConfirmation PendingCost(DateTimeOffset expiresAt) => new()
    {
        ConfirmationId = Guid.NewGuid(),
        AppointmentId = AppointmentId,
        Status = ConfirmationStatus.Pending,
        ExpiresAt = expiresAt,
    };

    // ── Vắng mặt ──

    [Fact]
    public async Task RunAsync_SpaConfirmedPastHold_CancelsAsNoShowAndReleasesStaff()
    {
        var f = new Fixture();
        var spa = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-20));
        f.Changes.Stored[AppointmentId] = spa;
        f.Candidates.NoShowIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(1, processed);
        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
        Assert.Equal(CancelReason.NoShow, spa.CancelReason);
        Assert.Contains(AppointmentId, f.Changes.StaffReleased);
    }

    [Fact]
    public async Task RunAsync_HotelConfirmedPastHold_CancelsAsNoShowAndClosesPendingCost()
    {
        var f = new Fixture();
        var stay = Stay(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-20));
        var cost = PendingCost(DateTimeOffset.UtcNow.AddMinutes(10));
        f.Changes.Stored[AppointmentId] = stay;
        f.Confirmations.Added.Add(cost);
        f.Candidates.NoShowIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(1, processed);
        Assert.Equal(AppointmentStatus.Cancelled, stay.Status);
        Assert.Equal(CancelReason.NoShow, stay.CancelReason);
        Assert.Equal(ConfirmationStatus.Expired, cost.Status);
        Assert.Empty(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task RunAsync_AppointmentReceivedInTime_IsSkipped()
    {
        var f = new Fixture();
        var spa = Spa(AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-20));
        f.Changes.Stored[AppointmentId] = spa;
        f.Candidates.NoShowIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(0, processed);
        Assert.Equal(AppointmentStatus.Received, spa.Status);
        Assert.Empty(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task RunAsync_ConfirmedButStillWithinHold_IsSkipped()
    {
        var f = new Fixture();
        var spa = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-10));
        f.Changes.Stored[AppointmentId] = spa;
        f.Candidates.NoShowIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(0, processed);
        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
    }

    [Fact]
    public async Task RunAsync_RunTwice_DoesNotProcessSameAppointmentAgain()
    {
        var f = new Fixture();
        f.Changes.Stored[AppointmentId] = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-20));
        f.Candidates.NoShowIds.Add(AppointmentId);

        var first = await f.Service.RunAsync();
        var second = await f.Service.RunAsync();

        Assert.Equal(1, first);
        Assert.Equal(0, second);
    }

    // ── Không phản hồi chi phí mới ──

    [Fact]
    public async Task RunAsync_SpaCostExpired_CancelsAsCostNotConfirmedAndReleasesStaff()
    {
        var f = new Fixture();
        var spa = Spa(AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-40));
        var cost = PendingCost(DateTimeOffset.UtcNow.AddMinutes(-1));
        f.Changes.Stored[AppointmentId] = spa;
        f.Confirmations.Added.Add(cost);
        f.Candidates.ExpiredCostIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(1, processed);
        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
        Assert.Equal(CancelReason.CostNotConfirmed, spa.CancelReason);
        Assert.Equal(ConfirmationStatus.Expired, cost.Status);
        Assert.Contains(AppointmentId, f.Changes.StaffReleased);
    }

    [Fact]
    public async Task RunAsync_HotelCostExpired_CancelsAsCostNotConfirmed()
    {
        var f = new Fixture();
        var stay = Stay(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-5));
        var cost = PendingCost(DateTimeOffset.UtcNow.AddMinutes(-1));
        f.Changes.Stored[AppointmentId] = stay;
        f.Confirmations.Added.Add(cost);
        f.Candidates.ExpiredCostIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(1, processed);
        Assert.Equal(AppointmentStatus.Cancelled, stay.Status);
        Assert.Equal(CancelReason.CostNotConfirmed, stay.CancelReason);
        Assert.Equal(ConfirmationStatus.Expired, cost.Status);
        Assert.Empty(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task RunAsync_CostNotYetExpired_IsSkipped()
    {
        var f = new Fixture();
        var spa = Spa(AppointmentStatus.Received, DateTimeOffset.UtcNow.AddMinutes(-40));
        var cost = PendingCost(DateTimeOffset.UtcNow.AddMinutes(5));
        f.Changes.Stored[AppointmentId] = spa;
        f.Confirmations.Added.Add(cost);
        f.Candidates.ExpiredCostIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(0, processed);
        Assert.Equal(AppointmentStatus.Received, spa.Status);
        Assert.Equal(ConfirmationStatus.Pending, cost.Status);
    }

    [Fact]
    public async Task RunAsync_OneAppointmentThrows_ContinuesProcessingRemainingInBatch()
    {
        var f = new Fixture();
        var badId = Guid.NewGuid();
        var goodId = Guid.NewGuid();
        var goodSpa = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-20));
        goodSpa.AppointmentId = goodId;
        f.Changes.Stored[goodId] = goodSpa;

        f.Candidates.NoShowIds.Add(badId);
        f.Candidates.NoShowIds.Add(goodId);
        f.Guard.ThrowOnId = badId;

        var processed = await f.Service.RunAsync();

        Assert.Equal(1, processed);
        Assert.Equal(AppointmentStatus.Cancelled, goodSpa.Status);
    }

    [Fact]
    public async Task RunAsync_CostExpiredButAppointmentAlreadyCancelled_ExpiresConfirmationWithoutCancellingAgain()
    {
        var f = new Fixture();
        var spa = Spa(AppointmentStatus.Cancelled, DateTimeOffset.UtcNow.AddMinutes(-40));
        var cost = PendingCost(DateTimeOffset.UtcNow.AddMinutes(-1));
        f.Changes.Stored[AppointmentId] = spa;
        f.Confirmations.Added.Add(cost);
        f.Candidates.ExpiredCostIds.Add(AppointmentId);

        var processed = await f.Service.RunAsync();

        Assert.Equal(0, processed);
        Assert.Equal(ConfirmationStatus.Expired, cost.Status);
        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
    }
}
