using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Services.Booking;

// UC-14 (FR-CHG-01, FR-CHG-02): khách hàng tự đổi hoặc hủy lịch hẹn của mình trong hạn tự phục vụ (BR-08).
// Quản lý đổi/hủy là việc của ID 76 nên service này không nhận vai trò khác Customer.
public sealed class AppointmentChangeService(
    IAppointmentChangeRepository changes,
    IConcurrencyGuard concurrency)
{
    // Khách tự hủy: Đã hủy, lý do CustomerCancelled do backend đặt (khách không gửi lý do).
    public async Task<AppointmentStatus> CancelAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        EnsureCustomer(user);

        var found = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        // Lịch của khách khác hoặc của khách vãng lai -> 403 FORBIDDEN (BR-16).
        OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        var deadlineMinutes = await changes.GetChangeDeadlineMinutesAsync(ct);
        EnsureChangeAllowed(found.Appointment, deadlineMinutes);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            // Đọc lại sau khi lấy khóa: lịch có thể vừa được xác nhận, hủy hoặc tiếp nhận.
            var fresh = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var appointment = fresh.Appointment;
            EnsureChangeAllowed(appointment, deadlineMinutes);

            appointment.Cancel(CancelReason.CustomerCancelled);

            // Lịch spa: nhả giữ chỗ nhân viên, giữ dòng làm lịch sử công việc.
            // Lịch lưu trú: chuồng được giải phóng vì chỉ lịch Confirmed/InStay mới giữ chuồng.
            if (appointment is SpaAppointment)
                await changes.ReleaseStaffHoldsAsync(appointmentId, ct);

            return appointment.Status;
        }, ct);
    }

    // Khách chỉ đổi/hủy lịch của chính mình; việc của quản lý nằm ở ID 76.
    private static void EnsureCustomer(CurrentUser user)
    {
        if (user.Role != UserRole.Customer) throw new BusinessException(ErrorCodes.Forbidden);
    }

    // Trạng thái trước (BR-14), rồi hạn tự đổi/hủy (BR-08, FR-CHG-02): còn cho phép khi giờ hẹn cách hiện tại
    // ít nhất deadlineMinutes phút. Giờ hẹn là giờ bắt đầu khung giờ spa hoặc giờ nhận lưu trú.
    private static void EnsureChangeAllowed(Appointment appointment, int deadlineMinutes)
    {
        appointment.EnsureCustomerCanChange();

        var start = appointment switch
        {
            SpaAppointment spa => spa.SlotStart,
            HotelAppointment stay => stay.PlannedCheckIn,
            _ => throw new InvalidOperationException("Loại lịch hẹn không được hỗ trợ."),
        };

        if (start - DateTimeOffset.UtcNow < TimeSpan.FromMinutes(deadlineMinutes))
            throw new BusinessException(ErrorCodes.ChangeWindowClosed);
    }
}
