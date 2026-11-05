using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record HotelBookingCreatedResponse(Guid AppointmentId, AppointmentStatus Status, int Nights, long EstimatedAmount)
{
    public static HotelBookingCreatedResponse From(HotelBookingResult result) =>
        new(result.AppointmentId, result.Status, result.Nights, (long)result.EstimatedAmount);
}