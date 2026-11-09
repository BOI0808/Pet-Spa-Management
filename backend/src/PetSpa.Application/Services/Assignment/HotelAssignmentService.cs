using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed class HotelAssignmentService(
    IHotelAssignmentRepository assignments,
    IStoreTimeZoneProvider timeZoneProvider,
    IConcurrencyGuard concurrencyGuard)
{
    public async Task<Cage?> SuggestCageAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var found = await assignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        var stay = found.Appointment;
        if (stay.Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        var cages = await assignments.ListActiveCagesAsync(found.Species, stay.SizeGroup, ct);
        var assignedStays = await assignments.ListAssignedStaysAsync(
            found.Species, stay.SizeGroup, stay.PlannedCheckIn, stay.PlannedCheckOut, ct);

        return HotelCapacityService.FindFreeCage(
            cages, assignedStays, stay.PlannedCheckIn, stay.PlannedCheckOut, timeZoneProvider.GetStoreTimeZone());
    }

    public async Task<AppointmentStatus> ConfirmAsync(Guid appointmentId, Guid cageId, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            var meta = await assignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: true, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            await concurrencyGuard.LockHotelGroupAsync(meta.Species, meta.Appointment.SizeGroup, ct);
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var found = await assignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var cage = await assignments.FindCageAsync(cageId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (found.Appointment.Status != AppointmentStatus.Pending)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            if (!cage.IsActive || cage.Species != found.Species || cage.SizeGroup != found.Appointment.SizeGroup)
                throw new BusinessException(ErrorCodes.CageConflict);

            var assignedStays = await assignments.ListAssignedStaysAsync(
                found.Species, found.Appointment.SizeGroup, found.Appointment.PlannedCheckIn, found.Appointment.PlannedCheckOut, ct);

            if (HotelCapacityService.IsCageOccupied(
                cageId,
                assignedStays.Where(s => s.AppointmentId != appointmentId),
                found.Appointment.PlannedCheckIn,
                found.Appointment.PlannedCheckOut,
                timeZoneProvider.GetStoreTimeZone()))
            {
                throw new BusinessException(ErrorCodes.CageConflict);
            }

            found.Appointment.AssignCage(cage, found.Species);

            return found.Appointment.Status;
        }, ct);
    }

    public async Task<AppointmentRejectResult> RejectAsync(Guid appointmentId, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            appointment.Reject();

            return new AppointmentRejectResult(appointment.Status, appointment.CancelReason!.Value);
        }, ct);
    }
}