namespace PetSpa.Application.Services.Booking;

public sealed record AppointmentChangeInput(
    Guid? PetId,
    IReadOnlyList<Guid>? ServiceIds,
    DateTimeOffset? SlotStart,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    IReadOnlyList<Guid>? StaffIds = null,
    Guid? CageId = null,
    bool ConfirmOutOfShift = false);
