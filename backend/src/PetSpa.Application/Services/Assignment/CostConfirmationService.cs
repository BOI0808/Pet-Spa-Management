using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Assignment;

public sealed class CostConfirmationService(
    IAppointmentChangeRepository appointments,
    ICostConfirmationRepository costConfirmations,
    IPetRepository pets,
    IHotelAssignmentRepository hotelAssignments,
    IConcurrencyGuard concurrencyGuard,
    IStaffRoleReader staffRoles,
    IPaymentRepository payments)
{
    public async Task<CostConfirmationResult> RespondAsync(
        CurrentUser user, Guid appointmentId, bool accept, CancellationToken ct = default)
    {
        if (user.Role == UserRole.Manager)
            throw new BusinessException(ErrorCodes.Forbidden);

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) != StaffRole.Receptionist)
            throw new BusinessException(ErrorCodes.Forbidden);

        var found = await appointments.FindWithOwnerAsync(appointmentId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (user.Role == UserRole.Customer)
            OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        var isExpired = false;
        var result = await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var fresh = await appointments.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var appointment = fresh.Appointment;

            var confirmation = await costConfirmations.FindPendingAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            EnsureAwaitingResponse(appointment);

            if (DateTimeOffset.UtcNow > confirmation.ExpiresAt)
            {
                confirmation.Expire();
                appointment.Cancel(CancelReason.CostNotConfirmed);
                if (appointment is SpaAppointment)
                    await appointments.ReleaseStaffHoldsAsync(appointment.AppointmentId, ct);

                isExpired = true;
                return new CostConfirmationResult(appointment.Status, null);
            }

            return accept
                ? await AcceptAsync(user, appointment, confirmation, ct)
                : await RejectAsync(user, appointment, confirmation, ct);
        }, ct);

        if (isExpired)
            throw new BusinessException(ErrorCodes.CostConfirmationExpired);

        return result;
    }

    private async Task<CostConfirmationResult> AcceptAsync(
        CurrentUser user, Appointment appointment, CostConfirmation confirmation, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(appointment.PetId, asNoTracking: false, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);
        var pet = found.Pet;
        var sizeRules = await pets.GetSizeRulesAsync(pet.Species, ct);

        confirmation.Accept(user.UserId);
        appointment.RecordWeight(confirmation.ActualWeightKg, confirmation.NewSizeGroup);
        pet.WeightKg = confirmation.ActualWeightKg;
        pet.DetermineSizeGroup(sizeRules);

        bool? cageSuitable = null;
        if (appointment is HotelAppointment stay)
        {
            await payments.UpdateStayAmountAsync(stay.AppointmentId, confirmation.NewAmount, ct);

            var cage = stay.CageId is { } cageId ? await hotelAssignments.FindCageAsync(cageId, ct) : null;
            cageSuitable = stay.IsCageSuitable(cage, pet.Species);
        }

        return new CostConfirmationResult(appointment.Status, cageSuitable);
    }

    private async Task<CostConfirmationResult> RejectAsync(
        CurrentUser user, Appointment appointment, CostConfirmation confirmation, CancellationToken ct)
    {
        confirmation.Reject(user.UserId);
        appointment.Cancel(CancelReason.CostNotConfirmed);

        if (appointment is SpaAppointment)
            await appointments.ReleaseStaffHoldsAsync(appointment.AppointmentId, ct);

        return new CostConfirmationResult(appointment.Status, null);
    }

    private static void EnsureAwaitingResponse(Appointment appointment)
    {
        var expected = appointment is SpaAppointment ? AppointmentStatus.Received : AppointmentStatus.Confirmed;

        if (appointment.Status != expected)
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }
}