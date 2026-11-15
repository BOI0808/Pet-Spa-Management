using PetSpa.Domain.Entities;

namespace PetSpa.Application.Ports;

public interface IPhotoRepository
{
    Task<Guid?> FindStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    Task<DateTimeOffset?> FindLatestBeforeUploadedAtAsync(Guid petId, CancellationToken ct = default);

    Task<int> GetValidityDaysAsync(CancellationToken ct = default);

    void Add(AppointmentPhoto photo);
}
