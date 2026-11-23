using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Payments;

public sealed class PaymentService(
    IPaymentRepository payments,
    ICostConfirmationRepository costConfirmations,
    IConcurrencyGuard concurrencyGuard,
    AppointmentQueryService appointmentQueries,
    IPaymentGateway paymentGateway)
{
    public async Task<PaymentStatus> RecordCounterAsync(
        CurrentUser user, Guid paymentId, PaymentMethod method, decimal receivedAmount, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockPaymentAsync(paymentId, ct);

            var found = await payments.FindWithAppointmentStatusAsync(paymentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var payment = found.Payment;

            await concurrencyGuard.LockAppointmentAsync(payment.AppointmentId, ct);

            var appointmentStatus = await payments.GetAppointmentStatusAsync(payment.AppointmentId, ct)
                ?? found.AppointmentStatus;

            if (payment.Kind == PaymentKind.Stay
                && await costConfirmations.HasPendingAsync(payment.AppointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            payment.MarkPaid(appointmentStatus, method, receivedAmount, user.UserId);

            return payment.Status;
        }, ct);
    }

    public async Task<OnlinePaymentResult> InitiateOnlineAsync(
        CurrentUser user, Guid paymentId, PaymentGateway gateway, string clientIp, CancellationToken ct = default)
    {
        if (gateway != paymentGateway.Gateway)
            throw new BusinessException(ErrorCodes.ValidationError, "Hiện chỉ hỗ trợ thanh toán trực tuyến qua cổng VNPAY.");

        var found = await payments.FindWithAppointmentStatusAsync(paymentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var payment = found.Payment;

        await appointmentQueries.GetAsync(user, payment.AppointmentId, ct);

        payment.EnsureCanPayOnline(found.AppointmentStatus);

        var txnRef = Guid.NewGuid().ToString("N");
        var createdAt = DateTimeOffset.UtcNow;

        var paymentUrl = paymentGateway.CreatePaymentUrl(new PaymentGatewayRequest(
            txnRef, payment.Amount, $"Thanh toan lich hen spa {txnRef}", clientIp, createdAt));

        await payments.AddTransactionAsync(new PaymentTransaction
        {
            TxnId = Guid.NewGuid(),
            PaymentId = payment.PaymentId,
            Gateway = paymentGateway.Gateway,
            TxnRef = txnRef,
            RequestedAmount = payment.Amount,
            CreatedAt = createdAt,
        }, ct);

        return new OnlinePaymentResult(paymentUrl, txnRef);
    }

    public async Task<GatewayCallbackResult> HandleGatewayCallbackAsync(
        IReadOnlyDictionary<string, string> parameters, CancellationToken ct = default)
    {
        var callback = paymentGateway.VerifyCallback(parameters);
        if (!callback.SignatureValid)
            return new GatewayCallbackResult(GatewayCallbackOutcome.InvalidSignature, callback.TxnRef, callback.Amount);

        var outcome = await ProcessCallbackAsync(callback, ct);
        return new GatewayCallbackResult(outcome, callback.TxnRef, callback.Amount);
    }

    private async Task<GatewayCallbackOutcome> ProcessCallbackAsync(PaymentGatewayCallback callback, CancellationToken ct)
    {
        var paymentId = await payments.FindPaymentIdByTxnRefAsync(callback.TxnRef, ct);
        if (paymentId is null)
            return GatewayCallbackOutcome.TransactionNotFound;

        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockPaymentAsync(paymentId.Value, ct);

            var transaction = await payments.FindTransactionByTxnRefAsync(callback.TxnRef, ct);
            if (transaction is null)
                return GatewayCallbackOutcome.TransactionNotFound;

            if (transaction.CallbackAt is not null)
                return GatewayCallbackOutcome.AlreadyProcessed;

            var found = await payments.FindWithAppointmentStatusAsync(paymentId.Value, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var payment = found.Payment;

            if (payment.Status == PaymentStatus.Paid)
            {
                if (callback.Amount is { } paidAmount)
                {
                    transaction.RecordCallback(paidAmount, callback.Success, DateTimeOffset.UtcNow);
                }
                return GatewayCallbackOutcome.AlreadyProcessed;
            }

            if (callback.Amount is not { } confirmedAmount || confirmedAmount != payment.Amount)
                return GatewayCallbackOutcome.AmountMismatch;

            if (!callback.Success)
            {
                transaction.RecordCallback(confirmedAmount, false, DateTimeOffset.UtcNow);
                return GatewayCallbackOutcome.Failed;
            }

            await concurrencyGuard.LockAppointmentAsync(payment.AppointmentId, ct);

            var appointmentStatus = await payments.GetAppointmentStatusAsync(payment.AppointmentId, ct)
                ?? found.AppointmentStatus;

            payment.MarkPaid(appointmentStatus, PaymentMethod.Online, confirmedAmount, null);
            transaction.RecordCallback(confirmedAmount, true, DateTimeOffset.UtcNow);

            return GatewayCallbackOutcome.Paid;
        }, ct);
    }

    public async Task<IReadOnlyList<Payment>> ListByAppointmentAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await appointmentQueries.GetAsync(user, appointmentId, ct);
        return await payments.ListByAppointmentAsync(appointmentId, ct);
    }

    public Task<PagedResult<Payment>> ListAsync(
        PaymentStatus? status, int page, int pageSize, CancellationToken ct = default) =>
        payments.ListAsync(status, page, pageSize, ct);
}