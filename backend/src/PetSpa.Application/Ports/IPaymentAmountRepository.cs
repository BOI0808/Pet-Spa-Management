using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record SpaAmountSnapshot(
    Species Species,
    SizeGroup SizeGroup,
    IReadOnlyList<Guid> ServiceIds,
    IReadOnlyList<ServicePricing> Pricing);

public sealed record StayAmountSnapshot(
    Species Species,
    SizeGroup SizeGroup,
    DateTimeOffset PlannedCheckIn,
    DateTimeOffset PlannedCheckOut);

public sealed record LateFeeRules(int GraceMinutes, int BlockMinutes);

public interface IPaymentAmountRepository
{
    Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default);

    Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default);

    Task<LateFeeRules> GetLateFeeRulesAsync(CancellationToken ct = default);

    TimeZoneInfo GetStoreTimeZone();
}