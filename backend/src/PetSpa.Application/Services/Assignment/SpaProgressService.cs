using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

// Thực hiện lịch spa: bắt đầu, cập nhật tiến độ từng dịch vụ, hoàn tất (FR-EXE-03, FR-EXE-04; BR-05, BR-06, BR-20, BR-23).
// Quyền (BR-05, BR-16): quản lý thao tác mọi lịch spa; nhân viên spa chỉ thao tác lịch được phân công cho mình.
public sealed class SpaProgressService(
    IAssignmentRepository assignments,
    IAppointmentQueryRepository appointments,
    IStaffRoleReader staffRoles,
    AppointmentPhotoService photoService,
    IPhotoRepository photos,
    ISpaProgressRepository progress,
    IAppointmentChangeRepository changes,
    IPaymentAmountRepository paymentAmounts,
    IPaymentRepository payments,
    IConcurrencyGuard concurrencyGuard)
{
    public async Task<AppointmentStatus> StartAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureCanOperateAsync(user, appointmentId, ct);

        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (appointment.Status != AppointmentStatus.Received)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            if (await progress.HasPendingCostConfirmationAsync(appointmentId, ct))
                throw new BusinessException(ErrorCodes.CostConfirmationPending);

            await photoService.EnsureValidBeforePhotoAsync(appointment.PetId, ct);

            appointment.Start();

            return appointment.Status;
        }, ct);
    }

    public async Task UpdateServiceAsync(
        CurrentUser user, Guid appointmentId, Guid serviceId, bool isDone, string? note,
        CancellationToken ct = default)
    {
        await EnsureCanOperateAsync(user, appointmentId, ct);

        await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (appointment.Status != AppointmentStatus.InProgress)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var line = await progress.FindServiceAsync(appointmentId, serviceId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            line.UpdateProgress(isDone, note, DateTimeOffset.UtcNow);
        }, ct);
    }

    public async Task<AppointmentStatus> CompleteAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        await EnsureCanOperateAsync(user, appointmentId, ct);

        return await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var appointment = await assignments.FindSpaAppointmentAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (appointment.Status != AppointmentStatus.InProgress)
                throw new BusinessException(ErrorCodes.InvalidTransition);

            var serviceLines = await progress.ListServiceLinesAsync(appointmentId, ct);
            if (serviceLines.Count == 0 || !serviceLines.All(s => s.IsDone))
                throw new BusinessException(ErrorCodes.ServicesIncomplete);

            var appointmentPhotos = await photos.ListByAppointmentAsync(appointmentId, ct);
            if (!appointmentPhotos.Any(p => p.Kind == PhotoKind.After))
                throw new BusinessException(ErrorCodes.PhotoRequired);

            appointment.Complete();

            await changes.ReleaseStaffHoldsAsync(appointmentId, ct);

            // Hình thành khoản thanh toán spa (FR-PAY-01): tính tiền theo dịch vụ, nhóm kích cỡ, đơn giá hiện tại.
            var serviceIds = serviceLines.Select(s => s.ServiceId).ToList();
            var snapshot = await paymentAmounts.GetSpaAsync(appointmentId, serviceIds, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            var amount = PricingService.CalculateSpaAmount(
                snapshot.Species, snapshot.SizeGroup, snapshot.ServiceIds, snapshot.Pricing);

            payments.Add(new Payment
            {
                PaymentId = Guid.NewGuid(),
                AppointmentId = appointmentId,
                Kind = PaymentKind.Spa,
                Amount = amount,
            });
            await payments.SaveChangesAsync(ct);

            return appointment.Status;
        }, ct);
    }

    // Kiểm tra quyền ngoài giao dịch (Backend-Conventions 7.2): vai trò → lịch tồn tại và là lịch spa → NVS được phân công.
    private async Task EnsureCanOperateAsync(CurrentUser user, Guid appointmentId, CancellationToken ct)
    {
        if (user.Role == UserRole.Staff)
        {
            if (await staffRoles.GetStaffRoleAsync(user.UserId, ct) != StaffRole.SpaStaff)
                throw new BusinessException(ErrorCodes.Forbidden);
        }
        else if (user.Role != UserRole.Manager)
        {
            throw new BusinessException(ErrorCodes.Forbidden);
        }

        var type = await assignments.FindAppointmentTypeAsync(appointmentId, ct);
        if (type != AppointmentType.Spa)
            throw new BusinessException(ErrorCodes.NotFound);

        if (user.Role == UserRole.Staff
            && !await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
            throw new BusinessException(ErrorCodes.Forbidden);
    }
}
