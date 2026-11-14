using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CancelAppointmentRequest(CancelReason? Reason = null);
