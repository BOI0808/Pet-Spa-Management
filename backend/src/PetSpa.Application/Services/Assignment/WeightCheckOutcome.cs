using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Assignment;

public sealed record WeightCheckOutcome(
    WeightCheckResult Result,
    SizeGroup? NewSizeGroup,
    decimal? OldAmount,
    decimal? NewAmount,
    DateTimeOffset? ExpiresAt = null,
    bool? CageSuitable = null);

public sealed record SpaCheckInResult(AppointmentStatus Status, WeightCheckOutcome WeightCheck);