using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Cài đặt ISpaProgressRepository.
public sealed class SpaProgressRepository(AppDbContext db) : ISpaProgressRepository
{
    public Task<bool> HasPendingCostConfirmationAsync(Guid appointmentId, CancellationToken ct = default) =>
        db.Set<CostConfirmation>().AsNoTracking()
            .AnyAsync(c => c.AppointmentId == appointmentId && c.Status == ConfirmationStatus.Pending, ct);

    public Task<AppointmentService?> FindServiceAsync(Guid appointmentId, Guid serviceId, CancellationToken ct = default) =>
        db.Set<AppointmentService>()
            .FirstOrDefaultAsync(s => s.AppointmentId == appointmentId && s.ServiceId == serviceId, ct);

    public async Task<bool> AreAllServicesDoneAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var services = await db.Set<AppointmentService>().AsNoTracking()
            .Where(s => s.AppointmentId == appointmentId)
            .Select(s => s.IsDone)
            .ToListAsync(ct);

        return services.Count > 0 && services.All(isDone => isDone);
    }

    public void AddPayment(Payment payment) => db.Set<Payment>().Add(payment);
}
