namespace PetSpa.Api.Dtos;

public sealed record ConfirmAppointmentRequest(
    Guid? CageId = null,
    IReadOnlyList<Guid>? StaffIds = null,
    bool ConfirmOutOfShift = false);