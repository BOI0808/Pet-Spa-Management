using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class PhotoRepository(AppDbContext db) : IPhotoRepository
{
    public Task<Guid?> FindStaffIdByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.Set<Staff>().AsNoTracking()
            .Where(s => s.UserId == userId)
            .Select(s => (Guid?)s.StaffId)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<AppointmentPhoto>> ListByAppointmentAsync(
        Guid appointmentId, CancellationToken ct = default) =>
        await db.Set<AppointmentPhoto>().AsNoTracking()
            .Where(p => p.AppointmentId == appointmentId)
            .OrderBy(p => p.UploadedAt).ThenBy(p => p.PhotoId)
            .ToListAsync(ct);

    public Task<DateTimeOffset?> FindLatestBeforeUploadedAtAsync(Guid petId, CancellationToken ct = default) =>
        (from p in db.Set<AppointmentPhoto>().AsNoTracking()
         join a in db.Set<Appointment>().AsNoTracking() on p.AppointmentId equals a.AppointmentId
         where a.PetId == petId && p.Kind == PhotoKind.Before
         orderby p.UploadedAt descending
         select (DateTimeOffset?)p.UploadedAt)
        .FirstOrDefaultAsync(ct);

    public async Task<int> GetValidityDaysAsync(CancellationToken ct = default)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "Photo.ValidityDays")
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException("Thiếu cấu hình Photo.ValidityDays.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }

    public void Add(AppointmentPhoto photo) => db.Set<AppointmentPhoto>().Add(photo);
}
