using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record HotelAppointmentWithSpecies(HotelAppointment Appointment, Species Species);

public interface IHotelAssignmentRepository
{
    Task<Appointment?> FindAppointmentAsync(
        Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default);

    Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(
        Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default);

    Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default);

    Task<IReadOnlyList<Cage>> ListActiveCagesAsync(
        Species species, SizeGroup sizeGroup, CancellationToken ct = default);

    Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default);
}