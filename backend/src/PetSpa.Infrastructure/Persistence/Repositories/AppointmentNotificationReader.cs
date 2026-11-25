using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class AppointmentNotificationReader(AppDbContext db) : IAppointmentNotificationReader
{
    public async Task<AppointmentNotificationTarget?> FindAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var row = await (
            from a in db.Set<Appointment>().AsNoTracking()
            join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
            join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
            where a.AppointmentId == appointmentId
            select new { Appointment = a, OwnerUserId = c.UserId, PetName = p.Name })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;

        var startAt = row.Appointment switch
        {
            SpaAppointment spa => spa.SlotStart,
            HotelAppointment stay => stay.PlannedCheckIn,
            _ => throw new InvalidOperationException("Loại lịch hẹn không được hỗ trợ."),
        };

        var staffUserIds = new List<Guid>();
        if (row.Appointment is SpaAppointment)
        {
            staffUserIds = await (
                from asg in db.Set<AppointmentStaff>().AsNoTracking()
                join s in db.Set<Staff>().AsNoTracking() on asg.StaffId equals s.StaffId
                where asg.AppointmentId == appointmentId
                select s.UserId)
                .Distinct()
                .ToListAsync(ct);
        }

        return new AppointmentNotificationTarget(
            row.Appointment is SpaAppointment ? AppointmentType.Spa : AppointmentType.Hotel,
            row.OwnerUserId,
            row.PetName,
            startAt,
            row.Appointment.CancelReason,
            staffUserIds);
    }
}
