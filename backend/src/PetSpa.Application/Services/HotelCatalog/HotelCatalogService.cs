using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;

namespace PetSpa.Application.Services;

public sealed class HotelCatalogService(IHotelCatalogRepository repository)
{
    public async Task<Guid> CreateCageAsync(CageInput input, CancellationToken ct = default)
    {
        var cage = new Cage
        {
            CageId = Guid.NewGuid(),
            Code = input.Code.Trim(),
            Species = input.Species,
            SizeGroup = input.SizeGroup,
        };

        await repository.AddCageAsync(cage, ct);
        return cage.CageId;
    }
}