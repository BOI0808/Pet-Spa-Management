using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public interface IHotelCatalogRepository
{
    Task AddCageAsync(Cage cage, CancellationToken ct = default);
}