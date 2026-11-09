using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class AppointmentListQuery
{
    public AppointmentType? Type { get; init; }
    public AppointmentStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

