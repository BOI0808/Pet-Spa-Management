using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public interface IHotelBookingRepository
{
    Task<bool> IsCustomerBookingLockedAsync(Guid customerId, CancellationToken ct = default);

    Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default);

    Task<IReadOnlyList<HotelAppointment>> ListHoldingStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default);

    void Add(HotelAppointment appointment);
}