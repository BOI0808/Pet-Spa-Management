using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.Booking;

public sealed record HotelBookingResult(Guid AppointmentId, AppointmentStatus Status, int Nights, decimal EstimatedAmount);