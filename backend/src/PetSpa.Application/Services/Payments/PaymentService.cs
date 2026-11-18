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
    AppointmentQueryService appointmentQueries)
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

            if (payment.Kind == PaymentKind.Stay
                && await costConfirmations.HasPendingAsync(payment.AppointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            payment.MarkPaid(found.AppointmentStatus, method, receivedAmount, user.UserId);

            return payment.Status;
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