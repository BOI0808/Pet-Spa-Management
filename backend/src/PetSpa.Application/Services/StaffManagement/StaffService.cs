using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Notifications;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.StaffManagement;

public sealed class StaffService(
    IStaffRepository staffs,
    IAppointmentChangeRepository changes,
    IConcurrencyGuard concurrency,
    NotificationService notifications,
    ShopTimeZone shopTimeZone)
{
    private sealed record ReturnedAppointment(Guid AppointmentId, Guid? OwnerUserId, DateTimeOffset SlotStart);

    public Task<Guid> CreateAsync(
        string userName, string fullName, StaffRole staffRole, string password, CancellationToken ct = default) =>
        staffs.CreateAsync(PhoneNumber.Normalize(userName), fullName.Trim(), staffRole, password, ct);

    public Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default) =>
        staffs.ListAsync(page, pageSize, ct);

    public Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default) =>
        staffs.UpdateAsync(staffId, fullName.Trim(), staffRole, ct);

    public async Task<int> DeactivateAsync(Guid staffId, CancellationToken ct = default)
    {
        var returned = new List<ReturnedAppointment>();

        await concurrency.RunAsync(async () =>
        {
            await staffs.DeactivateAsync(staffId, ct);

            foreach (var appointmentId in await staffs.ListConfirmedSpaAppointmentIdsAsync(staffId, ct))
            {
                await concurrency.LockAppointmentAsync(appointmentId, ct);

                var found = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct);
                if (found is null || found.Appointment is not SpaAppointment spa || spa.Status != AppointmentStatus.Confirmed)
                    continue;

                spa.ReturnToPending();
                await changes.RemoveStaffAssignmentsAsync(appointmentId, ct);

                returned.Add(new ReturnedAppointment(appointmentId, found.OwnerUserId, spa.SlotStart));
            }
        }, ct);

        foreach (var item in returned)
        {
            if (item.OwnerUserId is null) continue;

            var (day, time) = shopTimeZone.ToLocal(item.SlotStart);
            var message = FormattableString.Invariant(
                $"Lịch hẹn spa lúc {time:HH:mm} ngày {day:dd/MM/yyyy} của bạn quay về trạng thái Chờ xác nhận vì nhân viên phụ trách ngừng làm việc. Cửa hàng sẽ phân công lại nhân viên.");

            await notifications.CreateAsync(
                item.OwnerUserId.Value, NotificationType.StatusChanged, item.AppointmentId, message, ct);
        }

        return returned.Count;
    }
}
