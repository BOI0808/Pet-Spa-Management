using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record SuggestedCageResponse(Guid CageId, string Code, Species Species, SizeGroup SizeGroup, bool IsActive)
{
    public static SuggestedCageResponse From(Cage cage) =>
        new(cage.CageId, cage.Code, cage.Species, cage.SizeGroup, cage.IsActive);
}

public sealed record HotelCageSuggestionResponse(SuggestedCageResponse? Cage)
{
    public static HotelCageSuggestionResponse From(Cage? cage) =>
        new(cage is null ? null : SuggestedCageResponse.From(cage));
}