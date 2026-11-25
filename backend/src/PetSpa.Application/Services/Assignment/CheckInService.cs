using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed class CheckInService(
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrencyGuard,
    ShopTimeZone shopTimeZone,
    WeightCheckService weightCheckService,
    IHotelAssignmentRepository hotelAssignments,
    ICostConfirmationRepository costConfirmations,
    IPaymentRepository payments,
    AppointmentNotifier notifier)
{
    public async Task<SpaCheckInResult> CheckInSpaAsync(
        Guid appointmentId, decimal actualWeightKg, CancellationToken ct = default)
    {
        var result = await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var type = await assignments.FindAppointmentTypeAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (type == AppointmentType.Hotel)
                throw new BusinessException(ErrorCodes.InvalidTransition, "Lịch lưu trú được tiếp nhận không kèm cân nặng; cân nặng được ghi nhận ở bước đối chiếu cân nặng.");

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var (today, _) = shopTimeZone.ToLocal(DateTimeOffset.UtcNow);
            var (slotDate, _) = shopTimeZone.ToLocal(appointment.SlotStart);
            if (today < slotDate)
                throw new BusinessException(ErrorCodes.InvalidTransition, "Chưa đến ngày hẹn, không thể tiếp nhận.");

            var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
            if (DateTimeOffset.UtcNow > appointment.SlotStart.AddMinutes(holdMinutes))
                throw new BusinessException(ErrorCodes.InvalidTransition);

            appointment.Receive();

            var weightCheck = await weightCheckService.RecordForSpaAsync(appointment, actualWeightKg, ct);

            return new SpaCheckInResult(appointment.Status, weightCheck);
        }, ct);

        await notifier.NotifyStatusChangedAsync(appointmentId, result.Status, ct);

        if (result.WeightCheck is
            { Result: WeightCheckResult.NEEDS_CONFIRMATION, NewAmount: { } newAmount, ExpiresAt: { } expiresAt })
            await notifier.NotifyCostConfirmationAsync(appointmentId, actualWeightKg, newAmount, expiresAt, ct);

        return result;
    }

    public async Task<AppointmentType> GetAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
        await assignments.FindAppointmentTypeAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

    public async Task<AppointmentStatus> CheckInHotelAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var status = await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var type = await assignments.FindAppointmentTypeAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (type == AppointmentType.Spa)
                throw new BusinessException(ErrorCodes.ValidationError, "Cân nặng thực tế là bắt buộc khi tiếp nhận lịch spa.");

            var found = await hotelAssignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var stay = found.Appointment;

            if (stay.Status != AppointmentStatus.Confirmed)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var (today, _) = shopTimeZone.ToLocal(DateTimeOffset.UtcNow);
            var (checkInDate, _) = shopTimeZone.ToLocal(stay.PlannedCheckIn);
            if (today < checkInDate)
                throw new BusinessException(ErrorCodes.InvalidTransition, "Chưa đến ngày hẹn, không thể tiếp nhận.");

            var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
            if (DateTimeOffset.UtcNow > stay.PlannedCheckIn.AddMinutes(holdMinutes))
                throw new BusinessException(ErrorCodes.InvalidTransition);

            if (stay.ActualWeightKg is null)
                throw new BusinessException(ErrorCodes.InvalidTransition, "Chưa đối chiếu cân nặng thực tế của thú cưng.");

            if (await costConfirmations.HasPendingAsync(appointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            var cage = stay.CageId is { } cageId ? await hotelAssignments.FindCageAsync(cageId, ct) : null;
            if (!stay.IsCageSuitable(cage, found.Species))
                throw new BusinessException(ErrorCodes.CageConflict);

            if (stay.CageId is { } assignedCageId && await hotelAssignments.IsCageOccupiedAsync(assignedCageId, appointmentId, ct))
                throw new BusinessException(ErrorCodes.CageConflict, "Chuồng hiện đang có thú cưng lưu trú chưa trả phòng.");

            var stayPayments = await payments.ListByAppointmentAsync(appointmentId, ct);
            if (!stayPayments.Any(p => p.Kind == PaymentKind.Stay && p.Status == PaymentStatus.Paid))
                throw new BusinessException(ErrorCodes.PaymentNotDue);

            stay.CheckIn();

            return stay.Status;
        }, ct);

        await notifier.NotifyStatusChangedAsync(appointmentId, status, ct);
        return status;
    }
}