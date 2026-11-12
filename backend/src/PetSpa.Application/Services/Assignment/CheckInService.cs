using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed class CheckInService(IAssignmentRepository assignments, IConcurrencyGuard concurrencyGuard)
{
    public async Task<AppointmentStatus> CheckInSpaAsync(Guid appointmentId, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var holdMinutes = await assignments.GetHoldMinutesAsync(ct);
            if (DateTimeOffset.UtcNow > appointment.SlotStart.AddMinutes(holdMinutes))
                throw new BusinessException(ErrorCodes.InvalidTransition);

            appointment.Receive();

            return appointment.Status;
        }, ct);
    }
}