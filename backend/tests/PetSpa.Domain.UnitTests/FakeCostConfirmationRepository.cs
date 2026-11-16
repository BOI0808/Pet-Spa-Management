using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Domain.UnitTests;

internal sealed class FakeCostConfirmationRepository : ICostConfirmationRepository
{
    public int TimeoutMinutes { get; set; } = 30;
    public List<CostConfirmation> Added { get; } = [];

    public Task<int> GetTimeoutMinutesAsync(CancellationToken ct = default) =>
        Task.FromResult(TimeoutMinutes);

    public Task<bool> HasPendingAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(Added.Any(c => c.AppointmentId == appointmentId
                                    && c.Status == ConfirmationStatus.Pending
                                    && c.ExpiresAt > DateTimeOffset.UtcNow));

    public Task<CostConfirmation?> FindPendingAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult(Added.FirstOrDefault(c => c.AppointmentId == appointmentId && c.Status == ConfirmationStatus.Pending));

    public void Add(CostConfirmation confirmation) => Added.Add(confirmation);
}