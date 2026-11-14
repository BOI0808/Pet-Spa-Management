using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed class CheckInService(
    IAssignmentRepository assignments,
    IConcurrencyGuard concurrencyGuard,
    ShopTimeZone shopTimeZone,
    WeightCheckService weightCheckService)
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
                throw new BusinessException(ErrorCodes.InvalidTransition, "Chưa hỗ trợ tiếp nhận lịch lưu trú tại thời điểm này.");

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
}