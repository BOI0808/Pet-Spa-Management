using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Assignment;

public sealed record CostConfirmationResult(AppointmentStatus Status, bool? CageSuitable);