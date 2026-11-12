using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

// Adapter của IAppointmentQueryRepository.
public sealed class AppointmentQueryRepository(AppDbContext db) : IAppointmentQueryRepository
{
    public async Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
        Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        var appointments = db.Set<Appointment>().AsNoTracking();

        if (type == AppointmentType.Spa) appointments = appointments.Where(a => a is SpaAppointment);
        else if (type == AppointmentType.Hotel) appointments = appointments.Where(a => a is HotelAppointment);

        if (status is { } wantedStatus) appointments = appointments.Where(a => a.Status == wantedStatus);

        if (petId is { } wantedPetId) appointments = appointments.Where(a => a.PetId == wantedPetId);

        // Phạm vi theo token (BR-16): chỉ lịch của khách có Customer.UserId trùng người gọi.
        var query =
            from a in appointments
            join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
            join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
            where c.UserId == customerUserId
            select new { Appointment = a, CustomerName = c.FullName, PetName = p.Name };

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(x => x.Appointment.CreatedAt)
            .ThenByDescending(x => x.Appointment.AppointmentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rows.Select(r => ToListItem(r.Appointment, r.CustomerName, r.PetName)).ToList();
        return new PagedResult<AppointmentListItem>(items, page, pageSize, total);
    }

    public async Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var row = await (
            from a in db.Set<Appointment>().AsNoTracking()
            join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
            join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
            where a.AppointmentId == appointmentId
            select new { Appointment = a, OwnerUserId = c.UserId, CustomerName = c.FullName, PetName = p.Name })
            .FirstOrDefaultAsync(ct);

        if (row is null) return null;

        var appointmentItem = ToListItem(row.Appointment, row.CustomerName, row.PetName);

        var pendingCost = await db.Set<CostConfirmation>().AsNoTracking()
            .Where(c => c.AppointmentId == appointmentId && c.Status == ConfirmationStatus.Pending)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);

        // Dịch vụ và nhân viên chỉ có ở lịch spa.
        if (row.Appointment is not SpaAppointment)
            return new AppointmentDetailData(appointmentItem, row.OwnerUserId, [], [], pendingCost);

        var serviceRows = await (
            from s in db.Set<AppointmentService>().AsNoTracking()
            join sv in db.Set<Service>().AsNoTracking() on s.ServiceId equals sv.ServiceId
            where s.AppointmentId == appointmentId
            orderby sv.Name, sv.ServiceId
            select new { s.ServiceId, sv.Name, s.IsDone, s.DoneAt, s.Note })
            .ToListAsync(ct);

        var staffRows = await (
            from s in db.Set<AppointmentStaff>().AsNoTracking()
            join st in db.Set<Staff>().AsNoTracking() on s.StaffId equals st.StaffId
            where s.AppointmentId == appointmentId
            orderby s.AssignedAt, s.StaffId
            select new { s.StaffId, st.FullName, s.IsHolding, s.AssignedAt })
            .ToListAsync(ct);

        return new AppointmentDetailData(
            appointmentItem,
            row.OwnerUserId,
            serviceRows.Select(r => new AppointmentServiceLine(r.ServiceId, r.Name, r.IsDone, r.DoneAt, r.Note)).ToList(),
            staffRows.Select(r => new AppointmentStaffLine(r.StaffId, r.FullName, r.IsHolding, r.AssignedAt)).ToList(),
            pendingCost);
    }

    public async Task<PagedResult<AppointmentListItem>> ListBySpaStaffUserAsync(
        Guid staffUserId, AppointmentType? type, AppointmentStatus? status, int page, int pageSize,
        CancellationToken ct = default)
    {
        var appointments = db.Set<Appointment>().AsNoTracking();

        if (type == AppointmentType.Spa) appointments = appointments.Where(a => a is SpaAppointment);
        else if (type == AppointmentType.Hotel) appointments = appointments.Where(a => a is HotelAppointment);

        if (status is { } wantedStatus) appointments = appointments.Where(a => a.Status == wantedStatus);

        var query =
            from a in appointments
            join asg in db.Set<AppointmentStaff>().AsNoTracking() on a.AppointmentId equals asg.AppointmentId
            join s in db.Set<Staff>().AsNoTracking() on asg.StaffId equals s.StaffId
            join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
            join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
            where s.UserId == staffUserId && asg.IsHolding
            select new { Appointment = a, CustomerName = c.FullName, PetName = p.Name };

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(x => x.Appointment.CreatedAt)
            .ThenBy(x => x.Appointment.AppointmentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rows.Select(r => ToListItem(r.Appointment, r.CustomerName, r.PetName)).ToList();
        return new PagedResult<AppointmentListItem>(items, page, pageSize, total);
    }

    public Task<bool> IsAssignedToSpaStaffAsync(Guid appointmentId, Guid staffUserId, CancellationToken ct = default) =>
        (from asg in db.Set<AppointmentStaff>().AsNoTracking()
         join s in db.Set<Staff>().AsNoTracking() on asg.StaffId equals s.StaffId
         where asg.AppointmentId == appointmentId && s.UserId == staffUserId
         select asg.AppointmentId)
        .AnyAsync(ct);

    private static AppointmentListItem ToListItem(Appointment a, string customerName, string petName)
    {
        var spa = a as SpaAppointment;
        var hotel = a as HotelAppointment;

        return new AppointmentListItem(
            a.AppointmentId, spa is not null ? AppointmentType.Spa : AppointmentType.Hotel,
            a.CustomerId, a.PetId, customerName, petName,
            a.Status, a.CancelReason, a.CancelledAt, a.SizeGroup, a.ActualWeightKg,
            spa?.SlotStart, spa?.SlotEnd, spa?.StaffRequired,
            hotel?.PlannedCheckIn, hotel?.PlannedCheckOut, hotel?.ActualCheckOut, hotel?.CageId,
            a.CreatedAt, a.UpdatedAt);
    }
}
