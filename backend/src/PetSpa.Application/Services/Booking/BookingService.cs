using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record SpaSlotItem(TimeOnly Time, SlotGroup Group, SlotStatus Status);

public sealed record SpaSlotsResult(
    int DurationMinutes, int StaffRequired, int BufferMinutes, IReadOnlyList<SpaSlotItem> Slots);

// Kết quả tạo lịch spa. Thời điểm ở UTC; tiền tạm tính do backend tính.
public sealed record SpaBookingResult(
    Guid AppointmentId,
    AppointmentStatus Status,
    SizeGroup SizeGroup,
    DateTimeOffset SlotStart,
    DateTimeOffset SlotEnd,
    int StaffRequired,
    decimal EstimatedAmount);

public sealed class BookingService(
    IPetRepository pets,
    IServiceCatalogRepository catalog,
    IBookingRepository bookings,
    IStaffRoleReader staffRoles,
    IConcurrencyGuard concurrency,
    ShopTimeZone shopTimeZone)
{
    public async Task<SpaSlotsResult> GetSpaSlotsAsync(
        CurrentUser user, DateOnly date, Guid petId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default)
    {
        var found = await pets.FindWithOwnerAsync(petId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        await EnsureCanBookForAsync(user, found.OwnerUserId, ct);

        var pet = found.Pet;
        if (!pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        var plan = await PlanSpaAsync(pet, serviceIds, ct);

        var candidates = (await catalog.GetSlotTimesAsync(ct))
            .Select(t => new SlotCandidate(t, shopTimeZone.ToUtc(date, t)))
            .ToList();

        // Chỉ lấy dữ liệu trong khoảng từ mốc đầu tiên đến hết khoảng giữ chỗ của mốc cuối cùng.
        var windowStart = candidates.Min(c => c.Start);
        var windowEnd = candidates.Max(c => c.Start).AddMinutes(plan.DurationMinutes + plan.BufferMinutes);

        var shifts = await bookings.ListSpaStaffShiftsAsync(windowStart, windowEnd, ct);
        var held = await bookings.ListHeldBookingsAsync(windowStart, windowEnd, ct);

        var slots = SlotService
            .AvailableSlots(
                candidates, plan.LatestStartTime, plan.DurationMinutes, plan.StaffRequired, plan.BufferMinutes, shifts, held)
            .Select(r => new SpaSlotItem(r.Time, SlotService.GroupOf(r.Time), r.Status))
            .ToList();

        return new SpaSlotsResult(plan.DurationMinutes, plan.StaffRequired, plan.BufferMinutes, slots);
    }

    // Tạo lịch hẹn spa "Chờ xác nhận". Khách tự đặt, hoặc lễ tân đặt thay (kèm customerId).
    public async Task<SpaBookingResult> CreateSpaAppointmentAsync(
        CurrentUser user, Guid? customerId, Guid petId, IReadOnlyList<Guid> serviceIds, DateTimeOffset slotStart,
        CancellationToken ct = default)
    {
        var found = await pets.FindWithOwnerAsync(petId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        // Khách chỉ đặt cho thú cưng của mình; lễ tân đặt cho thú cưng của cửa hàng.
        await EnsureCanBookForAsync(user, found.OwnerUserId, ct);

        var pet = found.Pet;
        if (!pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        // Lịch hẹn gắn với khách sở hữu thú cưng. Khách tự đặt: customerId trong body bị bỏ qua.
        // Lễ tân đặt thay: phải chỉ rõ khách, và thú cưng phải thuộc khách đó.
        if (user.Role != UserRole.Customer)
        {
            if (customerId is null || customerId == Guid.Empty)
                throw new BusinessException(ErrorCodes.ValidationError, "Lễ tân phải chọn khách hàng (customerId).");

            if (customerId != pet.CustomerId)
                throw new BusinessException(ErrorCodes.ValidationError, "Thú cưng không thuộc khách hàng này.");
        }

        // Kiểm tra dịch vụ, thời lượng, số nhân viên cần và mốc muộn nhất.
        var plan = await PlanSpaAsync(pet, serviceIds, ct);

        // slotStart có thể kèm offset (vd +07:00); Npgsql chỉ ghi timestamptz với offset 0 nên đổi về UTC (như WorkShiftService).
        var slotStartUtc = slotStart.ToUniversalTime();
        var (day, time) = shopTimeZone.ToLocal(slotStartUtc);

        // slotStart phải đúng một mốc giờ trong Booking.SlotTimes.
        if (!(await catalog.GetSlotTimesAsync(ct)).Contains(time))
            throw new BusinessException(ErrorCodes.ValidationError, "slotStart phải đúng một mốc giờ đặt lịch của cửa hàng.");

        // Tiền tạm tính do backend tính theo đơn giá hiện có, không nhận từ client.
        var pricing = await bookings.ListPricingAsync(plan.ServiceIds, pet.Species, pet.SizeGroup, ct);
        var estimatedAmount = PricingService.CalculateSpaAmount(pet.Species, pet.SizeGroup, plan.ServiceIds, pricing);

        var slotEnd = slotStartUtc.AddMinutes(plan.DurationMinutes);
        var busyUntil = slotEnd.AddMinutes(plan.BufferMinutes);

        // Lấy khóa theo ngày, đọc lại ca làm và lịch đang giữ chỗ rồi mới ghi.
        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockSpaDayAsync(day, ct);

            var shifts = await bookings.ListSpaStaffShiftsAsync(slotStartUtc, busyUntil, ct);
            var held = await bookings.ListHeldBookingsAsync(slotStartUtc, busyUntil, ct);

            var status = SlotService.AvailableSlots(
                [new SlotCandidate(time, slotStartUtc)],
                plan.LatestStartTime, plan.DurationMinutes, plan.StaffRequired, plan.BufferMinutes, shifts, held)[0].Status;

            // Đã kín hoặc muộn hơn mốc bắt đầu muộn nhất: cùng trả 409 SLOT_FULL.
            if (status != SlotStatus.Available) throw new BusinessException(ErrorCodes.SlotFull);

            var appointment = new SpaAppointment
            {
                AppointmentId = Guid.NewGuid(),
                CustomerId = pet.CustomerId,
                PetId = pet.PetId,
                SizeGroup = pet.SizeGroup,
                SlotStart = slotStartUtc,
                SlotEnd = slotEnd,
                BusyUntil = busyUntil,
                StaffRequired = (short)plan.StaffRequired,
            };
            bookings.AddSpaAppointment(appointment, plan.ServiceIds);

            return new SpaBookingResult(
                appointment.AppointmentId, appointment.Status, appointment.SizeGroup,
                slotStartUtc, slotEnd, plan.StaffRequired, estimatedAmount);
        }, ct);
    }

    // Phần tính chung của một lịch spa, dùng cho cả xem mốc giờ và tạo lịch.
    private sealed record SpaPlan(
        IReadOnlyList<Guid> ServiceIds, int DurationMinutes, int StaffRequired, TimeOnly LatestStartTime, int BufferMinutes);

    // Chỉ chọn được dịch vụ đang cung cấp và áp dụng cho loài của thú cưng
    // (dòng giá theo loài và nhóm kích cỡ của thú cưng).
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

    // Khách chỉ xem cho thú cưng của mình; lễ tân xem cho thú cưng của cả cửa hàng. Còn lại từ chối.
    private async Task EnsureCanBookForAsync(CurrentUser user, Guid? ownerUserId, CancellationToken ct)
    {
        if (user.Role == UserRole.Customer)
        {
            OwnershipGuard.EnsureOwner(user, ownerUserId);
            return;
        }

        if (user.Role == UserRole.Staff
            && await staffRoles.GetStaffRoleAsync(user.UserId, ct) == StaffRole.Receptionist)
        {
            return;
        }

        throw new BusinessException(ErrorCodes.Forbidden);
    }
}

