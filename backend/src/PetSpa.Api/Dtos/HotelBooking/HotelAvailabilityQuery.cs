namespace PetSpa.Api.Dtos;

public sealed class HotelAvailabilityQuery
{
    public Guid? PetId { get; init; }
    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }
}