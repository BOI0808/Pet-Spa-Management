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
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var found = await assignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var cage = await assignments.FindCageAsync(cageId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            found.Appointment.AssignCage(cage, found.Species);

            return found.Appointment.Status;
        }, ct);
    }

    public async Task<HotelRejectResult> RejectAsync(Guid appointmentId, CancellationToken ct = default)
    {
        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var found = await assignments.FindHotelAppointmentAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            found.Appointment.Reject();

            return new HotelRejectResult(found.Appointment.Status, found.Appointment.CancelReason!.Value);
        }, ct);
    }
}