using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Assignment;

public sealed record CheckOutResult(AppointmentStatus Status, decimal? LateFee);