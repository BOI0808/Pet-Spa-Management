using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Dtos;

public sealed record UpdateAppointmentRequest(
    DateTimeOffset? SlotStart = null,
    DateTimeOffset? PlannedCheckIn = null,
    DateTimeOffset? PlannedCheckOut = null,
    Guid? PetId = null,
    IReadOnlyList<Guid>? ServiceIds = null,
    IReadOnlyList<Guid>? StaffIds = null,
    Guid? CageId = null,
    bool ConfirmOutOfShift = false)
{
    public AppointmentChangeInput ToInput() =>
        new(PetId, ServiceIds, SlotStart, PlannedCheckIn, PlannedCheckOut, StaffIds, CageId, ConfirmOutOfShift);
}
