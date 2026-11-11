using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

// UC-14 (FR-CHG-01, FR-CHG-02): khách hàng tự đổi hoặc hủy lịch hẹn của mình trong hạn tự phục vụ (BR-08).
// Quản lý đổi/hủy là việc của ID 76 nên service này không nhận vai trò khác Customer.
public sealed class AppointmentChangeService(
    IAppointmentChangeRepository changes,
    IPetRepository pets,
    IBookingRepository bookings,
    IServiceCatalogRepository catalog,
    ShopTimeZone shopTimeZone,
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

    // Khách tự đổi lịch: thành công thì lịch ở Chờ xác nhận (BR-26). Gửi đủ trường của loại lịch hẹn.
    public async Task<AppointmentStatus> ChangeAsync(
        CurrentUser user, Guid appointmentId, AppointmentChangeInput input, CancellationToken ct = default)
    {
        EnsureCustomer(user);

        var found = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        var deadlineMinutes = await changes.GetChangeDeadlineMinutesAsync(ct);
        EnsureChangeAllowed(found.Appointment, deadlineMinutes);

        if (found.Appointment is SpaAppointment)
            return await ChangeSpaAsync(user, appointmentId, input, deadlineMinutes, ct);

        // Đổi lịch lưu trú được bổ sung ở Phần 5.
        throw new BusinessException(ErrorCodes.ValidationError, "Đổi lịch lưu trú chưa được hỗ trợ.");
    }

    private async Task<AppointmentStatus> ChangeSpaAsync(
        CurrentUser user, Guid appointmentId, AppointmentChangeInput input, int deadlineMinutes, CancellationToken ct)
    {
        if (input.SlotStart is null || input.PetId is null || input.ServiceIds is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Đổi lịch spa cần slotStart, petId và serviceIds.");

        // Thú cưng mới (hoặc thú cưng cũ) phải thuộc khách và đang hoạt động; dịch vụ phải áp dụng cho loài (BR-02).
        var pet = await FindOwnPetAsync(user, input.PetId.Value, ct);
        var plan = await PlanSpaAsync(pet, input.ServiceIds, ct);

        // slotStart có thể kèm offset (vd +07:00); đổi về UTC như BookingService.
        var slotStartUtc = input.SlotStart.Value.ToUniversalTime();
        if (slotStartUtc <= DateTimeOffset.UtcNow)
            throw new BusinessException(ErrorCodes.ValidationError, "Khung giờ mới phải ở tương lai.");

        var (day, time) = shopTimeZone.ToLocal(slotStartUtc);
        if (!(await catalog.GetSlotTimesAsync(ct)).Contains(time))
            throw new BusinessException(ErrorCodes.ValidationError, "slotStart phải đúng một mốc giờ đặt lịch của cửa hàng.");

        var slotEnd = slotStartUtc.AddMinutes(plan.DurationMinutes);
        var busyUntil = slotEnd.AddMinutes(plan.BufferMinutes);

        return await concurrency.RunAsync(async () =>
        {
            // Khóa tư vấn theo ngày của mốc mới trước, khóa dòng lịch hẹn sau (Backend-Conventions 7.2).
            await concurrency.LockSpaDayAsync(day, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var fresh = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (fresh.Appointment is not SpaAppointment spa)
                throw new BusinessException(ErrorCodes.NotFound);

            EnsureChangeAllowed(spa, deadlineMinutes);

            var shifts = await bookings.ListSpaStaffShiftsAsync(slotStartUtc, busyUntil, ct);
            var held = (await bookings.ListHeldBookingsAsync(slotStartUtc, busyUntil, ct)).ToList();

            // Danh sách giữ chỗ có cả lượt giữ chỗ cũ của chính lịch này: bỏ ra để không tự chiếm chỗ của mình.
            held.Remove(new HeldBooking(spa.SlotStart, spa.BusyUntil, spa.StaffRequired));

            var status = SlotService.AvailableSlots(
                [new SlotCandidate(time, slotStartUtc)],
                plan.LatestStartTime, plan.DurationMinutes, plan.StaffRequired, plan.BufferMinutes, shifts, held)[0].Status;

            // Đã kín hoặc muộn hơn mốc bắt đầu muộn nhất: cùng trả 409 SLOT_FULL (BR-13).
            if (status != SlotStatus.Available) throw new BusinessException(ErrorCodes.SlotFull);

            // Domain kiểm tra trạng thái và đưa lịch về Chờ xác nhận (BR-26); sau đó xử lý dòng phụ.
            spa.ChangeByCustomer(pet.PetId, pet.SizeGroup, slotStartUtc, slotEnd, busyUntil, (short)plan.StaffRequired);
            await changes.RemoveStaffAssignmentsAsync(appointmentId, ct);
            await changes.ReplaceServicesAsync(appointmentId, plan.ServiceIds, ct);

            return spa.Status;
        }, ct);
    }

    // Thú cưng phải thuộc khách đang đăng nhập (BR-16) và đang hoạt động.
    private async Task<Pet> FindOwnPetAsync(CurrentUser user, Guid petId, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(petId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        return found.Pet;
    }

    private sealed record SpaPlan(
        IReadOnlyList<Guid> ServiceIds, int DurationMinutes, int StaffRequired, TimeOnly LatestStartTime, int BufferMinutes);

    // Mô phỏng BookingService.PlanSpaAsync (private): chỉ chọn được dịch vụ đang cung cấp và áp dụng cho loài
    // của thú cưng; tính thời lượng, số nhân viên cần, mốc bắt đầu muộn nhất.
    private async Task<SpaPlan> PlanSpaAsync(Pet pet, IReadOnlyList<Guid> serviceIds, CancellationToken ct)
    {
        var distinctIds = serviceIds.Distinct().ToList();
        var services = await bookings.FindBookableServicesAsync(distinctIds, pet.Species, pet.SizeGroup, ct);
        if (services.Count != distinctIds.Count)
            throw new BusinessException(
                ErrorCodes.ValidationError,
                "Có dịch vụ không tồn tại, đã ngừng cung cấp hoặc không áp dụng cho loài của thú cưng.");

        var duration = services.Sum(s => s.DurationMinutes);
        var staffRequired = SlotService.RequiredStaff(services.Select(s => s.StaffRequired), pet.Temperament);
        var latestStart = services.Min(s => s.LatestStartTime);
        var buffer = await bookings.GetBufferMinutesAsync(ct);

        return new SpaPlan(distinctIds, duration, staffRequired, latestStart, buffer);
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
