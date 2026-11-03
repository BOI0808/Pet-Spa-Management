using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class PaymentAmountRepository(AppDbContext db) : IPaymentAmountRepository
{
    public async Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var appointment = await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new { a.PetId, a.SizeGroup, a.Status })
            .FirstOrDefaultAsync(ct);
        if (appointment is null) return null;

        var species = await GetSpeciesAsync(appointment.PetId, ct);

        var serviceIds = await db.Set<AppointmentService>().AsNoTracking()
            .Where(s => s.AppointmentId == appointmentId)
            .Select(s => s.ServiceId)
            .ToListAsync(ct);

        var pricing = await db.Set<ServicePricing>().AsNoTracking()
            .Where(p => serviceIds.Contains(p.ServiceId)
                && p.Species == species
                && p.SizeGroup == appointment.SizeGroup)
            .ToListAsync(ct);

        return new SpaAmountSnapshot(species, appointment.SizeGroup, appointment.Status, serviceIds, pricing);
    }

    public async Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var appointment = await db.Set<HotelAppointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new { a.PetId, a.SizeGroup, a.Status, a.PlannedCheckIn, a.PlannedCheckOut, a.ActualCheckOut })
            .FirstOrDefaultAsync(ct);
        if (appointment is null) return null;

        var species = await GetSpeciesAsync(appointment.PetId, ct);

        return new StayAmountSnapshot(
            species,
            appointment.SizeGroup,
            appointment.Status,
            appointment.PlannedCheckIn,
            appointment.PlannedCheckOut,
            appointment.ActualCheckOut);
    }

    public async Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default)
    {
        var keys = new[] { "Hotel.LateGraceMinutes", "Hotel.LateBlockMinutes", "Hotel.LateFeePerBlock" };
        var configs = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => keys.Contains(c.ConfigKey))
            .ToDictionaryAsync(c => c.ConfigKey, c => c.ConfigValue, ct);

        var graceMinutes = configs.TryGetValue("Hotel.LateGraceMinutes", out var graceStr)
            ? int.Parse(graceStr, CultureInfo.InvariantCulture)
            : throw new InvalidOperationException("Thiếu cấu hình Hotel.LateGraceMinutes.");

        var blockMinutes = configs.TryGetValue("Hotel.LateBlockMinutes", out var blockStr)
            ? int.Parse(blockStr, CultureInfo.InvariantCulture)
            : throw new InvalidOperationException("Thiếu cấu hình Hotel.LateBlockMinutes.");

        var feePerBlock = configs.TryGetValue("Hotel.LateFeePerBlock", out var feeStr)
            ? decimal.Parse(feeStr, CultureInfo.InvariantCulture)
            : 0m;

        return new LateFeeConfig(graceMinutes, blockMinutes, feePerBlock);
    }

    private async Task<Species> GetSpeciesAsync(Guid petId, CancellationToken ct) =>
        await db.Set<Pet>().AsNoTracking()
            .Where(p => p.PetId == petId)
            .Select(p => p.Species)
            .FirstAsync(ct);
}
