using PetSpa.Application.Common;
using PetSpa.Application.Ports;
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
    IPaymentRepository payments)
{
    public async Task<SpaCheckInResult> CheckInSpaAsync(
        Guid appointmentId, decimal actualWeightKg, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
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
    }

    public async Task<AppointmentStatus> CheckInHotelAsync(Guid appointmentId, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
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

            var stayPayments = await payments.ListByAppointmentAsync(appointmentId, ct);
            if (!stayPayments.Any(p => p.Kind == PaymentKind.Stay && p.Status == PaymentStatus.Paid))
                throw new BusinessException(ErrorCodes.PaymentNotDue);

            stay.CheckIn();

            return stay.Status;
        }, ct);
    }
}