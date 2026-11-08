using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record AppointmentRejectedResponse(AppointmentStatus Status, CancelReason Reason)
{
    public static AppointmentRejectedResponse From(HotelRejectResult result) =>
        new(result.Status, result.Reason);
}