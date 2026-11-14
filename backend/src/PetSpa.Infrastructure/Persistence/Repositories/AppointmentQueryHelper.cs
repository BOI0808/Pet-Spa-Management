using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

internal sealed class AppointmentQueryRow
{
    public required Appointment Appointment { get; init; }
    public required string CustomerName { get; init; }
    public required string PetName { get; init; }
}

internal static class AppointmentQueryHelper
{
    public static IQueryable<Appointment> FilterByDate(
        IQueryable<Appointment> appointments, DateOnly? date, ShopTimeZone shopTimeZone)
    {
        if (date is not { } requestedDate) return appointments;

        var dayStartUtc = shopTimeZone.ToUtc(requestedDate, TimeOnly.MinValue);
        var dayEndUtc = shopTimeZone.ToUtc(requestedDate.AddDays(1), TimeOnly.MinValue);

        return appointments.Where(a =>
            (a is SpaAppointment && ((SpaAppointment)a).SlotStart >= dayStartUtc && ((SpaAppointment)a).SlotStart < dayEndUtc)
            || (a is HotelAppointment && (
                (((HotelAppointment)a).PlannedCheckIn >= dayStartUtc && ((HotelAppointment)a).PlannedCheckIn < dayEndUtc)
                || (((HotelAppointment)a).PlannedCheckOut >= dayStartUtc && ((HotelAppointment)a).PlannedCheckOut < dayEndUtc)
                || (((HotelAppointment)a).ActualCheckOut != null && ((HotelAppointment)a).ActualCheckOut >= dayStartUtc && ((HotelAppointment)a).ActualCheckOut < dayEndUtc))));
    }

    public static AppointmentSort ResolveEffectiveSort(
        AppointmentSort? sort, DateOnly? date, AppointmentStatus? status)
    {
        if (sort.HasValue) return sort.Value;
        if (date.HasValue) return AppointmentSort.TimeAsc;
        if (status is AppointmentStatus.Completed or AppointmentStatus.Cancelled) return AppointmentSort.TimeDesc;
        if (status is AppointmentStatus.Confirmed or AppointmentStatus.Received or AppointmentStatus.InProgress or AppointmentStatus.InStay) return AppointmentSort.TimeAsc;
        return AppointmentSort.CreatedDesc;
    }

    public static IOrderedQueryable<AppointmentQueryRow> ApplySort(
        IQueryable<AppointmentQueryRow> query, AppointmentSort sort) => sort switch
    {
        AppointmentSort.TimeAsc => query
            .OrderBy(x => x.Appointment is SpaAppointment ? ((SpaAppointment)x.Appointment).SlotStart : ((HotelAppointment)x.Appointment).PlannedCheckIn)
            .ThenBy(x => x.Appointment.AppointmentId),
        AppointmentSort.TimeDesc => query
            .OrderByDescending(x => x.Appointment is SpaAppointment ? ((SpaAppointment)x.Appointment).SlotStart : ((HotelAppointment)x.Appointment).PlannedCheckIn)
            .ThenByDescending(x => x.Appointment.AppointmentId),
        AppointmentSort.CreatedAsc => query
            .OrderBy(x => x.Appointment.CreatedAt)
            .ThenBy(x => x.Appointment.AppointmentId),
        AppointmentSort.CreatedDesc => query
            .OrderByDescending(x => x.Appointment.CreatedAt)
            .ThenByDescending(x => x.Appointment.AppointmentId),
        _ => query
            .OrderBy(x => x.Appointment is SpaAppointment ? ((SpaAppointment)x.Appointment).SlotStart : ((HotelAppointment)x.Appointment).PlannedCheckIn)
            .ThenBy(x => x.Appointment.AppointmentId),
    };
}

