namespace PetSpa.Application.Services.Booking;

public sealed record HotelBookingInput(Guid PetId, DateTimeOffset PlannedCheckIn, DateTimeOffset PlannedCheckOut);