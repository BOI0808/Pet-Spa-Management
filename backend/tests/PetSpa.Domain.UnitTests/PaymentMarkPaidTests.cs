using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PaymentMarkPaidTests
{
    private const decimal Due = 300_000m;

    private static Payment NewPayment(PaymentKind kind) => new()
    {
        PaymentId = Guid.NewGuid(),
        AppointmentId = Guid.NewGuid(),
        Kind = kind,
        Amount = Due,
    };

    private static void AssertError(string code, Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public void NewPayment_StartsUnpaid()
    {
        var payment = NewPayment(PaymentKind.Spa);

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
        Assert.Null(payment.Method);
        Assert.Null(payment.ReceivedAmount);
        Assert.Null(payment.PaidAt);
        Assert.Null(payment.ConfirmedByUserId);
    }

    [Theory]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Completed)]
    [InlineData(PaymentKind.Stay, AppointmentStatus.Confirmed)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.InStay)]
    public void MarkPaid_WhenDueAndAmountEnough_BecomesPaid(PaymentKind kind, AppointmentStatus appointmentStatus)
    {
        var payment = NewPayment(kind);

        payment.MarkPaid(appointmentStatus, PaymentMethod.Cash, Due, Guid.NewGuid());

        Assert.Equal(PaymentStatus.Paid, payment.Status);
    }

    [Fact]
    public void MarkPaid_RecordsMethodReceivedAmountPaidAtAndConfirmer()
    {
        var payment = NewPayment(PaymentKind.Spa);
        var confirmer = Guid.NewGuid();
        var before = DateTimeOffset.UtcNow;

        payment.MarkPaid(AppointmentStatus.Completed, PaymentMethod.BankQR, Due, confirmer);

        Assert.Equal(PaymentMethod.BankQR, payment.Method);
        Assert.Equal(Due, payment.ReceivedAmount);
        Assert.Equal(confirmer, payment.ConfirmedByUserId);
        Assert.NotNull(payment.PaidAt);
        Assert.True(payment.PaidAt >= before);
        Assert.True(payment.PaidAt <= DateTimeOffset.UtcNow);
    }

    [Fact]
    public void MarkPaid_AtCounter_WhenReceivedMoreThanAmount_IsAccepted()
    {
        var payment = NewPayment(PaymentKind.Spa);

        payment.MarkPaid(AppointmentStatus.Completed, PaymentMethod.Cash, Due + 20_000m, Guid.NewGuid());

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(Due + 20_000m, payment.ReceivedAmount);
    }

    [Fact]
    public void MarkPaid_Online_WhenExactAmount_BecomesPaidWithoutConfirmer()
    {
        var payment = NewPayment(PaymentKind.Spa);

        payment.MarkPaid(AppointmentStatus.Completed, PaymentMethod.Online, Due, null);

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(PaymentMethod.Online, payment.Method);
        Assert.Null(payment.ConfirmedByUserId);
    }

    [Fact]
    public void MarkPaid_Online_WhenReceivedMoreThanAmount_ThrowsAmountMismatch()
    {
        var payment = NewPayment(PaymentKind.Spa);

        AssertError(ErrorCodes.AmountMismatch,
            () => payment.MarkPaid(AppointmentStatus.Completed, PaymentMethod.Online, Due + 1m, null));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
    }

    [Theory]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Pending)]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Confirmed)]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Received)]
    [InlineData(PaymentKind.Spa, AppointmentStatus.InProgress)]
    [InlineData(PaymentKind.Spa, AppointmentStatus.Cancelled)]
    [InlineData(PaymentKind.Stay, AppointmentStatus.Pending)]
    [InlineData(PaymentKind.Stay, AppointmentStatus.InStay)]
    [InlineData(PaymentKind.Stay, AppointmentStatus.Completed)]
    [InlineData(PaymentKind.Stay, AppointmentStatus.Cancelled)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.Pending)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.Confirmed)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.Completed)]
    [InlineData(PaymentKind.LateFee, AppointmentStatus.Cancelled)]
    public void MarkPaid_WhenAppointmentNotInDueStatus_ThrowsPaymentNotDue(
        PaymentKind kind, AppointmentStatus appointmentStatus)
    {
        var payment = NewPayment(kind);

        AssertError(ErrorCodes.PaymentNotDue,
            () => payment.MarkPaid(appointmentStatus, PaymentMethod.Cash, Due, Guid.NewGuid()));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
        Assert.Null(payment.ReceivedAmount);
        Assert.Null(payment.PaidAt);
    }

    [Theory]
    [InlineData(PaymentMethod.Cash, 299_999)]
    [InlineData(PaymentMethod.BankQR, 0)]
    [InlineData(PaymentMethod.Online, 299_999)]
    public void MarkPaid_WhenAmountLessThanDue_ThrowsAmountMismatchAndStaysUnpaid(
        PaymentMethod method, decimal receivedAmount)
    {
        var payment = NewPayment(PaymentKind.Spa);

        AssertError(ErrorCodes.AmountMismatch,
            () => payment.MarkPaid(AppointmentStatus.Completed, method, receivedAmount, Guid.NewGuid()));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
        Assert.Null(payment.Method);
        Assert.Null(payment.ReceivedAmount);
        Assert.Null(payment.PaidAt);
        Assert.Null(payment.ConfirmedByUserId);
    }

    [Fact]
    public void MarkPaid_WhenNotDueAndAmountShort_ReportsNotDueFirst()
    {
        var payment = NewPayment(PaymentKind.Spa);

        AssertError(ErrorCodes.PaymentNotDue,
            () => payment.MarkPaid(AppointmentStatus.InProgress, PaymentMethod.Cash, 0m, Guid.NewGuid()));
    }

    [Fact]
    public void MarkPaid_WhenAlreadyPaid_ThrowsInvalidTransitionAndKeepsFirstRecord()
    {
        var payment = NewPayment(PaymentKind.Spa);
        var firstConfirmer = Guid.NewGuid();
        payment.MarkPaid(AppointmentStatus.Completed, PaymentMethod.Cash, Due, firstConfirmer);
        var firstPaidAt = payment.PaidAt;

        AssertError(ErrorCodes.InvalidTransition,
            () => payment.MarkPaid(AppointmentStatus.Completed, PaymentMethod.BankQR, Due + 50_000m, Guid.NewGuid()));

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(PaymentMethod.Cash, payment.Method);
        Assert.Equal(Due, payment.ReceivedAmount);
        Assert.Equal(firstConfirmer, payment.ConfirmedByUserId);
        Assert.Equal(firstPaidAt, payment.PaidAt);
    }
}
