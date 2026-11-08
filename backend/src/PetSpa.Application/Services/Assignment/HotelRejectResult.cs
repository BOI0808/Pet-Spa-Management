using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Assignment;

public sealed record HotelRejectResult(AppointmentStatus Status, CancelReason Reason);