using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Dtos;

public sealed record HotelBookingRequest(
    Guid? PetId,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    Guid? CustomerId)
{
    public HotelBookingInput ToInput() => new(PetId!.Value, PlannedCheckIn!.Value, PlannedCheckOut!.Value);
}