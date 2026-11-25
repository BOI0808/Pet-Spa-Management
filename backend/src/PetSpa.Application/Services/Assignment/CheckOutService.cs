using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed class CheckOutService(
    IHotelAssignmentRepository hotelAssignments,
    IPaymentRepository payments,
    IPaymentAmountRepository paymentAmounts,
    IConcurrencyGuard concurrencyGuard,
    AppointmentNotifier notifier)
{
    public async Task<CheckOutResult> CheckOutHotelAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var lateFeeUnpaid = false;

        var result = await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await hotelAssignments.FindAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (appointment is not HotelAppointment stay || stay.Status != AppointmentStatus.InStay)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            stay.ActualCheckOut ??= DateTimeOffset.UtcNow;

            var lateFee = (await payments.ListByAppointmentAsync(appointmentId, ct))
                .FirstOrDefault(p => p.Kind == PaymentKind.LateFee);

            if (lateFee is null)
            {
                var config = await paymentAmounts.GetLateFeeConfigAsync(ct);
                var amount = PricingService.CalculateLateFee(
                    stay.PlannedCheckOut,
                    stay.ActualCheckOut.Value,
                    config.GraceMinutes,
                    config.BlockMinutes,
                    config.FeePerBlock);

                if (amount > 0)
                {
                    lateFee = new Payment
                    {
                        PaymentId = Guid.NewGuid(),
                        AppointmentId = appointmentId,
                        Kind = PaymentKind.LateFee,
                        Amount = amount,
                    };
                    payments.Add(lateFee);
                    await payments.SaveChangesAsync(ct);
                }
            }

            if (lateFee is { Status: not PaymentStatus.Paid })
            {
                lateFeeUnpaid = true;
                return new CheckOutResult(stay.Status, lateFee.Amount);
            }

            stay.CheckOut(stay.ActualCheckOut);

            return new CheckOutResult(stay.Status, lateFee?.Amount);
        }, ct);

        if (lateFeeUnpaid)
            throw new BusinessException(ErrorCodes.PaymentNotDue);

        await notifier.NotifyStatusChangedAsync(appointmentId, result.Status, ct);
        return result;
    }
}
