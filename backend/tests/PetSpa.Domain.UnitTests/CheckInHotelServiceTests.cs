using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CheckInHotelServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid CageId = Guid.NewGuid();

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public AppointmentType? StoredType { get; set; }
        public int HoldMinutes { get; set; } = 15;

        public Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(StoredType);

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

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) =>
            throw new NotImplementedException();
    }

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public Appointment? Appointment { get; set; }
        public Species Species { get; set; } = Species.Dog;
        public Cage? Cage { get; set; }

        public Task<Appointment?> FindAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Appointment is HotelAppointment stay ? new HotelAppointmentWithSpecies(stay, Species) : null);

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) => Task.FromResult(Cage);
        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Guid? LockedAppointmentId { get; private set; }

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            LockedAppointmentId = appointmentId;
            return Task.CompletedTask;
        }
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed record Fixture(
        CheckInService Sut,
        HotelAppointment Stay,
        FakeAssignmentRepository Assignments,
        FakeStayPaymentRepository Payments,
        FakeCostConfirmationRepository CostConfirmations,
        FakeConcurrencyGuard Guard);

    private static Payment NewPayment(PaymentKind kind, bool paid)
    {
        var payment = new Payment
        {
            PaymentId = Guid.NewGuid(),
            AppointmentId = AppointmentId,
            Kind = kind,
            Amount = 300_000m,
        };

        if (paid)
        {
            var dueStatus = kind switch
            {
                PaymentKind.Stay => AppointmentStatus.Confirmed,
                PaymentKind.LateFee => AppointmentStatus.InStay,
                _ => AppointmentStatus.Completed,
            };
            payment.MarkPaid(dueStatus, PaymentMethod.Cash, payment.Amount, Guid.NewGuid());
        }

        return payment;
    }

    private static Fixture CreateSut(
        AppointmentStatus status = AppointmentStatus.Confirmed,
        DateTimeOffset? plannedCheckIn = null,
        SizeGroup cageSizeGroup = SizeGroup.Small,
        bool stayPaid = true)
    {
        var checkIn = plannedCheckIn ?? DateTimeOffset.UtcNow.AddMinutes(-10);
        var stay = new HotelAppointment
        {
            AppointmentId = AppointmentId,
            Status = status,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
            CageId = CageId,
            ActualWeightKg = 8m,
        };
        var cage = new Cage
        {
            CageId = CageId,
            Code = "A1",
            Species = Species.Dog,
            SizeGroup = cageSizeGroup,
            IsActive = true,
        };

        var assignments = new FakeAssignmentRepository { StoredType = AppointmentType.Hotel };
        var hotelAssignments = new FakeHotelAssignmentRepository { Appointment = stay, Cage = cage };
        var costConfirmations = new FakeCostConfirmationRepository();
        var payments = new FakeStayPaymentRepository();
        payments.Payments.Add(NewPayment(PaymentKind.Stay, stayPaid));
        var guard = new FakeConcurrencyGuard();

        var sut = new CheckInService(
            assignments,
            guard,
            new ShopTimeZone(TimeZoneInfo.Utc),
            null!,
            hotelAssignments,
            costConfirmations,
            payments);

        return new Fixture(sut, stay, assignments, payments, costConfirmations, guard);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenAllConditionsMet_MovesToInStay()
    {
        var f = CreateSut();

        var status = await f.Sut.CheckInHotelAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.InStay, status);
        Assert.Equal(AppointmentStatus.InStay, f.Stay.Status);
        Assert.Equal(AppointmentId, f.Guard.LockedAppointmentId);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenBeforePlannedCheckIn_MovesToInStay()
    {
        var f = CreateSut(plannedCheckIn: DateTimeOffset.UtcNow.AddDays(1));

        var status = await f.Sut.CheckInHotelAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.InStay, status);
    }

    [Fact]
    public async Task CheckInHotelAsync_UsesConfiguredHoldMinutes()
    {
        var f = CreateSut(plannedCheckIn: DateTimeOffset.UtcNow.AddMinutes(-20));
        f.Assignments.HoldMinutes = 30;

        var status = await f.Sut.CheckInHotelAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.InStay, status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task CheckInHotelAsync_WhenNotConfirmed_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var f = CreateSut(status);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenPastHoldMinutes_ThrowsInvalidTransition()
    {
        var f = CreateSut(plannedCheckIn: DateTimeOffset.UtcNow.AddMinutes(-30));

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenWeightNotChecked_ThrowsInvalidTransition()
    {
        var f = CreateSut();
        f.Stay.ActualWeightKg = null;

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenCostConfirmationPending_ThrowsCostConfirmationPending()
    {
        var f = CreateSut();
        f.CostConfirmations.Add(new CostConfirmation
        {
            AppointmentId = AppointmentId,
            Status = ConfirmationStatus.Pending,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
        });

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.CostConfirmationPending, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenCageNoLongerSuitable_ThrowsCageConflict()
    {
        var f = CreateSut(cageSizeGroup: SizeGroup.Large);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.CageConflict, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenStayUnpaid_ThrowsPaymentNotDue()
    {
        var f = CreateSut(stayPaid: false);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenNoStayPayment_ThrowsPaymentNotDue()
    {
        var f = CreateSut();
        f.Payments.Payments.Clear();
        f.Payments.Payments.Add(NewPayment(PaymentKind.LateFee, paid: true));

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, f.Stay.Status);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var f = CreateSut();
        f.Assignments.StoredType = null;

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckInHotelAsync_WhenSpaAppointment_ThrowsValidationError()
    {
        var f = CreateSut();
        f.Assignments.StoredType = AppointmentType.Spa;

        var ex = await Assert.ThrowsAsync<BusinessException>(() => f.Sut.CheckInHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }
}