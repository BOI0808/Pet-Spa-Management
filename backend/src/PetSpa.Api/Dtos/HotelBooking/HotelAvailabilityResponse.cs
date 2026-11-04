using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Dtos;

public sealed record HotelAvailabilityResponse(bool Available, int Nights, long EstimatedAmount)
{
    public static HotelAvailabilityResponse From(HotelAvailabilityResult result) =>
        new(result.Available, result.Nights, (long)result.EstimatedAmount);
}