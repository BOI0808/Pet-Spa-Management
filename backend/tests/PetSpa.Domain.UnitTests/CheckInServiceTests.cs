using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CheckInServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public SpaAppointment? Appointment { get; set; }
        public AppointmentType? AppointmentType { get; set; } = Domain.Enums.AppointmentType.Spa;
        public int HoldMinutes { get; set; } = 15;

        public Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Appointment is not null ? AppointmentType : null);

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<int> GetHoldMinutesAsync(CancellationToken ct = default) =>
            Task.FromResult(HoldMinutes);

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

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) =>
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

    private static SpaAppointment Spa(AppointmentStatus status, DateTimeOffset slotStart) => new()
    {
        AppointmentId = AppointmentId,
        Status = status,
        StaffRequired = 1,
        SizeGroup = SizeGroup.Medium,
        SlotStart = slotStart,
        SlotEnd = slotStart.AddHours(1),
        BusyUntil = slotStart.AddMinutes(75),
    };

    private static (CheckInService Sut, FakeAssignmentRepository Repo, FakeConcurrencyGuard Guard) CreateSut(
        SpaAppointment? appointment, int holdMinutes = 15, AppointmentType? appointmentType = AppointmentType.Spa)
    {
        var repo = new FakeAssignmentRepository
        {
            Appointment = appointment,
            HoldMinutes = holdMinutes,
            AppointmentType = appointmentType
        };
        var guard = new FakeConcurrencyGuard();
        var shopTimeZone = new ShopTimeZone(TimeZoneInfo.Utc);
        return (new CheckInService(repo, guard, shopTimeZone), repo, guard);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenConfirmedAndWithinHold_MovesToReceived()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-10));
        var (sut, _, guard) = CreateSut(appointment);

        var status = await sut.CheckInSpaAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.Received, status);
        Assert.Equal(AppointmentStatus.Received, appointment.Status);
        Assert.Equal(AppointmentId, guard.LockedAppointmentId);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenBeforeSlotStartOnSameDay_MovesToReceived()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(30));
        var (sut, _, _) = CreateSut(appointment);

        var status = await sut.CheckInSpaAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.Received, status);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenFutureDate_ThrowsInvalidTransition()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddDays(1));
        var (sut, _, _) = CreateSut(appointment);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenPastHoldMinutes_ThrowsInvalidTransitionAndKeepsStatus()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-30));
        var (sut, _, _) = CreateSut(appointment);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Fact]
    public async Task CheckInSpaAsync_UsesConfiguredHoldMinutes()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-20));
        var (sut, _, _) = CreateSut(appointment, holdMinutes: 30);

        var status = await sut.CheckInSpaAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.Received, status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task CheckInSpaAsync_WhenNotConfirmed_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var appointment = Spa(status, DateTimeOffset.UtcNow.AddMinutes(-5));
        var (sut, _, _) = CreateSut(appointment);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, appointment.Status);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var (sut, _, _) = CreateSut(null);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenHotelAppointment_ThrowsInvalidTransition()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-5));
        var (sut, _, _) = CreateSut(appointment, appointmentType: AppointmentType.Hotel);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }
}
