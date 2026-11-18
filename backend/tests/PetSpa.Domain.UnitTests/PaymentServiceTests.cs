using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PaymentServiceTests
{
    private const decimal Due = 300_000m;
    private static readonly Guid PaymentId = Guid.NewGuid();
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly CurrentUser Receptionist = new(Guid.NewGuid(), UserRole.Staff);

    private sealed class FakePaymentRepository : IPaymentRepository
    {
        public Payment? Stored { get; set; }
        public AppointmentStatus AppointmentStatus { get; set; }

        public Task<PaymentWithAppointmentStatus?> FindWithAppointmentStatusAsync(
            Guid paymentId, CancellationToken ct = default) =>
            Task.FromResult<PaymentWithAppointmentStatus?>(
                Stored is not null && Stored.PaymentId == paymentId
                    ? new PaymentWithAppointmentStatus(Stored, AppointmentStatus)
                    : null);

        public Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<Payment>> ListAsync(
            PaymentStatus? status, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public List<Guid> LockedPaymentIds { get; } = [];

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default) => Task.CompletedTask;

        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default)
        {
            LockedPaymentIds.Add(paymentId);
            return Task.CompletedTask;
        }
    }

    private sealed class Fixture
    {
        public FakePaymentRepository Payments { get; } = new();
        public FakeCostConfirmationRepository Confirmations { get; } = new();
        public FakeConcurrencyGuard Guard { get; } = new();
        public PaymentService Service { get; }

        public Fixture() =>
            Service = new PaymentService(Payments, Confirmations, Guard, null!);
    }

    private static Payment NewPayment(PaymentKind kind) => new()
    {
        PaymentId = PaymentId,
        AppointmentId = AppointmentId,
        Kind = kind,
        Amount = Due,
    };

    private static CostConfirmation PendingConfirmation() => new()
    {
        ConfirmationId = Guid.NewGuid(),
        AppointmentId = AppointmentId,
        Status = ConfirmationStatus.Pending,
        ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
    };

    private static async Task AssertErrorAsync(string code, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public async Task RecordCounterAsync_WhenDueAndAmountEnough_MarksPaidAndLocksPayment()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Spa);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;

        var status = await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        Assert.Equal(PaymentStatus.Paid, status);
        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(PaymentMethod.Cash, payment.Method);
        Assert.Equal(Due, payment.ReceivedAmount);
        Assert.Equal(Receptionist.UserId, payment.ConfirmedByUserId);
        Assert.Single(fixture.Guard.LockedPaymentIds);
        Assert.Equal(PaymentId, fixture.Guard.LockedPaymentIds[0]);
    }

    [Fact]
    public async Task RecordCounterAsync_WhenReceivedLessThanAmount_ThrowsAmountMismatchAndStaysUnpaid()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Spa);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;

        await AssertErrorAsync(ErrorCodes.AmountMismatch,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.BankQR, Due - 1m));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
    }

    [Fact]
    public async Task RecordCounterAsync_WhenAppointmentNotDue_ThrowsPaymentNotDue()
    {
        var fixture = new Fixture();
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;

        await AssertErrorAsync(ErrorCodes.PaymentNotDue,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));
    }

    [Fact]
    public async Task RecordCounterAsync_WhenAlreadyPaid_ThrowsInvalidTransition()
    {
        var fixture = new Fixture();
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;
        await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        await AssertErrorAsync(ErrorCodes.InvalidTransition,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));
    }

    [Fact]
    public async Task RecordCounterAsync_WhenPaymentNotFound_ThrowsNotFound()
    {
        var fixture = new Fixture();

        await AssertErrorAsync(ErrorCodes.NotFound,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));
    }

    [Fact]
    public async Task RecordCounterAsync_StayWithPendingCostConfirmation_ThrowsCostConfirmationPending()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;
        fixture.Confirmations.Add(PendingConfirmation());

        await AssertErrorAsync(ErrorCodes.CostConfirmationPending,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
    }

    [Fact]
    public async Task RecordCounterAsync_StayWithoutPendingCostConfirmation_MarksPaid()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;

        var status = await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        Assert.Equal(PaymentStatus.Paid, status);
    }

    [Fact]
    public async Task RecordCounterAsync_SpaIgnoresCostConfirmationCheck()
    {
        var fixture = new Fixture();
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;
        fixture.Confirmations.Add(PendingConfirmation());

        var status = await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        Assert.Equal(PaymentStatus.Paid, status);
    }
}