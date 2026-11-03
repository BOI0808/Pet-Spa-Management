using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record SpaAmountSnapshot(
    Species Species,
    SizeGroup SizeGroup,
    AppointmentStatus Status,
    IReadOnlyList<Guid> ServiceIds,
    IReadOnlyList<ServicePricing> Pricing);

public sealed record StayAmountSnapshot(
    Species Species,
    SizeGroup SizeGroup,
    AppointmentStatus Status,
    DateTimeOffset PlannedCheckIn,
    DateTimeOffset PlannedCheckOut,
    DateTimeOffset? ActualCheckOut);

public sealed record LateFeeConfig(int GraceMinutes, int BlockMinutes, decimal FeePerBlock);

public interface IPaymentAmountRepository
{
    Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default);

    Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default);

    Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default);
}
