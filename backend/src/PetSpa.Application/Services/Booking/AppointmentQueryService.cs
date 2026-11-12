using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Booking;

public sealed class AppointmentQueryService(
    IAppointmentQueryRepository appointments,
    IBookingRepository bookings,
    IPetRepository pets,
    IStaffRoleReader staffRoles)
{
    public async Task<PagedResult<AppointmentListItem>> ListAsync(
        CurrentUser user, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct = default)
    {
        if (user.Role == UserRole.Customer)
            return await ListForCustomerAsync(user, type, status, petId, page, pageSize, ct);

        if (user.Role == UserRole.Manager)
            return await bookings.ListAppointmentsAsync(type, status, page, pageSize, ct);

        var staffRole = await RequireStaffRoleAsync(user, ct);
        if (staffRole == StaffRole.Receptionist)
            return await bookings.ListAppointmentsAsync(type, status, page, pageSize, ct);

        return await appointments.ListBySpaStaffUserAsync(user.UserId, type, status, page, pageSize, ct);
    }

    public async Task<AppointmentDetailData> GetAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        StaffRole? staffRole = null;
        if (user.Role == UserRole.Staff)
            staffRole = await RequireStaffRoleAsync(user, ct);

        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (user.Role == UserRole.Customer)
        {
            OwnershipGuard.EnsureOwner(user, detail.OwnerUserId);
        }
        else if (staffRole == StaffRole.SpaStaff
            && !await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
        {
            throw new BusinessException(ErrorCodes.Forbidden);
        }

        return detail;
    }

    private async Task<PagedResult<AppointmentListItem>> ListForCustomerAsync(
        CurrentUser user, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
        CancellationToken ct)
    {
        if (petId is { } requestedPetId)
        {
            var pet = await pets.FindWithOwnerAsync(requestedPetId, asNoTracking: true, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            OwnershipGuard.EnsureOwner(user, pet.OwnerUserId);
        }

        return await appointments.ListByCustomerUserAsync(user.UserId, type, status, petId, page, pageSize, ct);
    }

    private async Task<StaffRole> RequireStaffRoleAsync(CurrentUser user, CancellationToken ct) =>
        await staffRoles.GetStaffRoleAsync(user.UserId, ct)
            ?? throw new BusinessException(ErrorCodes.Forbidden);
}