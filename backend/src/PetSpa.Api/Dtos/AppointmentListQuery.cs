using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class AppointmentListQuery
{
    public AppointmentType? Type { get; init; }
    public AppointmentStatus? Status { get; init; }
    public DateOnly? Date { get; init; }
    public Guid? PetId { get; init; }
    public string? Sort { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;

    public AppointmentSort? ParsedSort => Sort?.Trim().ToLowerInvariant() switch
    {
        "time_asc" or "timeasc" or "time" => AppointmentSort.TimeAsc,
        "time_desc" or "timedesc" => AppointmentSort.TimeDesc,
        "created_desc" or "createddesc" => AppointmentSort.CreatedDesc,
        "created_asc" or "createdasc" => AppointmentSort.CreatedAsc,
        _ => null
    };
}
