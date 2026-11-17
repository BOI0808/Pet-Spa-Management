using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Services.StaffManagement;

public sealed class StaffService(
    IStaffRepository staffs,
    IAppointmentChangeRepository changes,
    IConcurrencyGuard concurrency)
{
    public Task<Guid> CreateAsync(
        string userName, string fullName, StaffRole staffRole, string password, CancellationToken ct = default) =>
        staffs.CreateAsync(PhoneNumber.Normalize(userName), fullName.Trim(), staffRole, password, ct);

    public Task<PagedResult<StaffSummary>> ListAsync(int page, int pageSize, CancellationToken ct = default) =>
        staffs.ListAsync(page, pageSize, ct);

    public Task UpdateAsync(Guid staffId, string fullName, StaffRole staffRole, CancellationToken ct = default) =>
        staffs.UpdateAsync(staffId, fullName.Trim(), staffRole, ct);

    public async Task<int> DeactivateAsync(Guid staffId, CancellationToken ct = default)
    {
        var returnedToPending = 0;

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

                returnedToPending++;
            }
        }, ct);

        return returnedToPending;
    }
}
