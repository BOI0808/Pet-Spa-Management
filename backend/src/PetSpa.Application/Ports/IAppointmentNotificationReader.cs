using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record AppointmentNotificationTarget(
    AppointmentType Type,
    Guid? CustomerUserId,
    string PetName,
    DateTimeOffset StartAt,
    CancelReason? CancelReason,
    IReadOnlyList<Guid> StaffUserIds);

public interface IAppointmentNotificationReader
{
    Task<AppointmentNotificationTarget?> FindAsync(Guid appointmentId, CancellationToken ct = default);
}
