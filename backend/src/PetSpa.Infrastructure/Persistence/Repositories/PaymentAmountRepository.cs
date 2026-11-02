using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class PaymentAmountRepository(AppDbContext db, IConfiguration configuration) : IPaymentAmountRepository
{
    public async Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var appointment = await db.Set<SpaAppointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new { a.PetId, a.SizeGroup })
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

        return new SpaAmountSnapshot(species, appointment.SizeGroup, serviceIds, pricing);
    }

    public async Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var appointment = await db.Set<HotelAppointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new { a.PetId, a.SizeGroup, a.PlannedCheckIn, a.PlannedCheckOut })
            .FirstOrDefaultAsync(ct);
        if (appointment is null) return null;

        var species = await GetSpeciesAsync(appointment.PetId, ct);

        return new StayAmountSnapshot(
            species,
            appointment.SizeGroup,
            appointment.PlannedCheckIn,
            appointment.PlannedCheckOut);
    }

    public async Task<LateFeeRules> GetLateFeeRulesAsync(CancellationToken ct = default)
    {
        var graceMinutes = await GetIntConfigAsync("Hotel.LateGraceMinutes", ct);
        var blockMinutes = await GetIntConfigAsync("Hotel.LateBlockMinutes", ct);

        return new LateFeeRules(graceMinutes, blockMinutes);
    }

    public TimeZoneInfo GetStoreTimeZone()
    {
        var id = configuration["App:TimeZone"]
            ?? throw new InvalidOperationException("Thiếu cấu hình App__TimeZone.");

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new InvalidOperationException($"Không tìm thấy múi giờ {id} khai báo ở App__TimeZone.");
        }
    }

    private async Task<Species> GetSpeciesAsync(Guid petId, CancellationToken ct) =>
        await db.Set<Pet>().AsNoTracking()
            .Where(p => p.PetId == petId)
            .Select(p => p.Species)
            .FirstAsync(ct);

    private async Task<int> GetIntConfigAsync(string key, CancellationToken ct)
    {
        var value = await db.Set<SystemConfig>().AsNoTracking()
            .Where(c => c.ConfigKey == key)
            .Select(c => c.ConfigValue)
            .FirstOrDefaultAsync(ct);

        if (value is null) throw new InvalidOperationException($"Thiếu cấu hình {key}.");

        return int.Parse(value, CultureInfo.InvariantCulture);
    }
}