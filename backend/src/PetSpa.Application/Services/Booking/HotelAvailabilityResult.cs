namespace PetSpa.Application.Services.Booking;

public sealed record HotelAvailabilityResult(bool Available, int Nights, decimal EstimatedAmount);