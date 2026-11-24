using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CheckOutServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly LateFeeConfig DefaultLateFeeConfig = new(30, 60, 50_000m);

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public Appointment? Appointment { get; set; }

        public Task<Appointment?> FindAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<bool> IsCageOccupiedAsync(Guid cageId, Guid currentAppointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakePaymentAmountRepository : IPaymentAmountRepository
    {
        public LateFeeConfig LateFeeConfig { get; set; } = DefaultLateFeeConfig;

        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default) =>
            Task.FromResult(LateFeeConfig);
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
        CheckOutService Sut,
        HotelAppointment Stay,
        FakeHotelAssignmentRepository HotelAssignments,
        FakeStayPaymentRepository Payments,
        FakeConcurrencyGuard Guard);

    private static Fixture CreateSut(
        AppointmentStatus status = AppointmentStatus.InStay,
        int minutesLate = 0,
        DateTimeOffset? actualCheckOut = null)
    {
        var plannedCheckOut = DateTimeOffset.UtcNow.AddMinutes(-minutesLate);
        var stay = new HotelAppointment
        {
            AppointmentId = AppointmentId,
            Status = status,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = plannedCheckOut.AddDays(-2),
            PlannedCheckOut = plannedCheckOut,
            CageId = Guid.NewGuid(),
            ActualCheckOut = actualCheckOut,
        };

        var hotelAssignments = new FakeHotelAssignmentRepository { Appointment = stay };
        var payments = new FakeStayPaymentRepository();
        var guard = new FakeConcurrencyGuard();
        var sut = new CheckOutService(hotelAssignments, payments, new FakePaymentAmountRepository(), guard);

        return new Fixture(sut, stay, hotelAssignments, payments, guard);
    }

    private static Payment NewLateFee(decimal amount, bool paid)
    {
        var payment = new Payment
        {
            PaymentId = Guid.NewGuid(),
            AppointmentId = AppointmentId,
            Kind = PaymentKind.LateFee,
            Amount = amount,
        };

        if (paid)
            payment.MarkPaid(AppointmentStatus.InStay, PaymentMethod.Cash, amount, Guid.NewGuid());

        return payment;
    }

    [Fact]
    public async Task CheckOutHotelAsync_WhenAppointmentMissing_ThrowsNotFound()
    {
        var fixture = CreateSut();
        fixture.HotelAssignments.Appointment = null;

        var ex = await Assert.ThrowsAsync<BusinessException>(() => fixture.Sut.CheckOutHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckOutHotelAsync_WhenAppointmentIsSpa_ThrowsInvalidTransition()
    {
        var fixture = CreateSut();
        fixture.HotelAssignments.Appointment = new SpaAppointment
        {
            AppointmentId = AppointmentId,
            Status = AppointmentStatus.Completed,
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() => fixture.Sut.CheckOutHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Empty(fixture.Payments.Payments);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task CheckOutHotelAsync_WhenNotInStay_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var fixture = CreateSut(status);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => fixture.Sut.CheckOutHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, fixture.Stay.Status);
        Assert.Null(fixture.Stay.ActualCheckOut);
        Assert.Empty(fixture.Payments.Payments);
    }

    [Theory]
    [InlineData(-120)]
    [InlineData(0)]
    [InlineData(29)]
    public async Task CheckOutHotelAsync_WhenNotLateBeyondGrace_CompletesWithoutLateFee(int minutesLate)
    {
        var fixture = CreateSut(minutesLate: minutesLate);

        var result = await fixture.Sut.CheckOutHotelAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.Completed, result.Status);
        Assert.Null(result.LateFee);
        Assert.Equal(AppointmentStatus.Completed, fixture.Stay.Status);
        Assert.NotNull(fixture.Stay.ActualCheckOut);
        Assert.Empty(fixture.Payments.Payments);
    }

    [Theory]
    [InlineData(31, 50_000)]
    [InlineData(45, 50_000)]
    [InlineData(100, 100_000)]
    public async Task CheckOutHotelAsync_WhenLateBeyondGrace_CreatesUnpaidLateFeeAndThrowsPaymentNotDue(
        int minutesLate, int expectedFee)
    {
        var fixture = CreateSut(minutesLate: minutesLate);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => fixture.Sut.CheckOutHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
        Assert.Equal(AppointmentStatus.InStay, fixture.Stay.Status);
        Assert.NotNull(fixture.Stay.ActualCheckOut);

        var lateFee = Assert.Single(fixture.Payments.Payments);
        Assert.Equal(AppointmentId, lateFee.AppointmentId);
        Assert.Equal(PaymentKind.LateFee, lateFee.Kind);
        Assert.Equal(PaymentStatus.Unpaid, lateFee.Status);
        Assert.Equal((decimal)expectedFee, lateFee.Amount);
    }

    [Fact]
    public async Task CheckOutHotelAsync_WhenLateFeeUnpaid_ThrowsPaymentNotDueWithoutNewPayment()
    {
        var recordedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        var fixture = CreateSut(minutesLate: 100, actualCheckOut: recordedAt);
        fixture.Payments.Payments.Add(NewLateFee(100_000m, paid: false));

        var ex = await Assert.ThrowsAsync<BusinessException>(() => fixture.Sut.CheckOutHotelAsync(AppointmentId));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
        Assert.Equal(AppointmentStatus.InStay, fixture.Stay.Status);
        Assert.Equal(recordedAt, fixture.Stay.ActualCheckOut);
        Assert.Single(fixture.Payments.Payments);
    }

    [Fact]
    public async Task CheckOutHotelAsync_WhenLateFeePaid_CompletesAndKeepsRecordedCheckOutTime()
    {
        var recordedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        var fixture = CreateSut(minutesLate: 100, actualCheckOut: recordedAt);
        fixture.Payments.Payments.Add(NewLateFee(100_000m, paid: true));

        var result = await fixture.Sut.CheckOutHotelAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.Completed, result.Status);
        Assert.Equal(100_000m, result.LateFee);
        Assert.Equal(AppointmentStatus.Completed, fixture.Stay.Status);
        Assert.Equal(recordedAt, fixture.Stay.ActualCheckOut);
        Assert.Single(fixture.Payments.Payments);
    }

    [Fact]
    public async Task CheckOutHotelAsync_LocksAppointment()
    {
        var fixture = CreateSut();

        await fixture.Sut.CheckOutHotelAsync(AppointmentId);

        Assert.Equal(AppointmentId, fixture.Guard.LockedAppointmentId);
    }
}