using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Cài đặt IAutoCancelRepository. Mọi mốc thời gian nhận vào đã ở UTC.
public sealed class AutoCancelRepository(AppDbContext db) : IAutoCancelRepository
{
    public async Task<IReadOnlyList<Guid>> ListNoShowCandidateIdsAsync(
        DateTimeOffset cutoff, CancellationToken ct = default)
    {
        // Giờ hẹn là SlotStart (spa) hoặc PlannedCheckIn (lưu trú).
        var spa = await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => a.Status == AppointmentStatus.Confirmed && a.SlotStart < cutoff)
            .Select(a => a.AppointmentId)
            .ToListAsync(ct);

        var hotel = await db.Set<HotelAppointment>().AsNoTracking()
            .Where(a => a.Status == AppointmentStatus.Confirmed && a.PlannedCheckIn < cutoff)
            .Select(a => a.AppointmentId)
            .ToListAsync(ct);

        return [.. spa, .. hotel];
    }
}
