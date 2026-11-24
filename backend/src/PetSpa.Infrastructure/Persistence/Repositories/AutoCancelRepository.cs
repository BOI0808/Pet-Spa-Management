using System.Globalization;
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

    public async Task<IReadOnlyList<Guid>> ListExpiredCostConfirmationAppointmentIdsAsync(
        DateTimeOffset now, CancellationToken ct = default) =>
        await db.Set<CostConfirmation>().AsNoTracking()
            .Where(c => c.Status == ConfirmationStatus.Pending && c.ExpiresAt < now)
            .Select(c => c.AppointmentId)
            .ToListAsync(ct);

    public async Task<NoShowLockRule> GetNoShowLockRuleAsync(CancellationToken ct = default)
    {
        var values = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == "NoShow.LockThreshold" || c.ConfigKey == "NoShow.WindowDays")
            .ToDictionaryAsync(c => c.ConfigKey, c => c.ConfigValue, ct);

        return new NoShowLockRule(ReadInt(values, "NoShow.LockThreshold"), ReadInt(values, "NoShow.WindowDays"));
    }

    // Đếm cả lịch spa và lưu trú: cùng bảng Appointment.
    public Task<int> CountNoShowsSinceAsync(Guid customerId, DateTimeOffset since, CancellationToken ct = default) =>
        db.Set<Appointment>().AsNoTracking()
            .CountAsync(a => a.CustomerId == customerId
                && a.CancelReason == CancelReason.NoShow
                && a.CancelledAt >= since, ct);

    public Task LockBookingAsync(Guid customerId, CancellationToken ct = default) =>
        db.Set<Customer>()
            .Where(c => c.CustomerId == customerId && !c.IsBookingLocked)
            .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.IsBookingLocked, true), ct);

    private static int ReadInt(IReadOnlyDictionary<string, string> values, string key) =>
        values.TryGetValue(key, out var value)
            ? int.Parse(value, CultureInfo.InvariantCulture)
            : throw new InvalidOperationException($"Thiếu cấu hình {key}.");
}
