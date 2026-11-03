using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed record SpaSlotItem(TimeOnly Time, SlotGroup Group, SlotStatus Status);

public sealed record SpaSlotsResult(
    int DurationMinutes, int StaffRequired, int BufferMinutes, IReadOnlyList<SpaSlotItem> Slots);

public sealed class BookingService(
    IPetRepository pets,
    IServiceCatalogRepository catalog,
    IBookingRepository bookings,
    IStaffRoleReader staffRoles,
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

        // Chỉ chọn được dịch vụ đang cung cấp và áp dụng cho loài của thú cưng
        // (dòng giá theo loài và nhóm kích cỡ của thú cưng).
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

        var candidates = (await catalog.GetSlotTimesAsync(ct))
            .Select(t => new SlotCandidate(t, shopTimeZone.ToUtc(date, t)))
            .ToList();

        // Chỉ lấy dữ liệu trong khoảng từ mốc đầu tiên đến hết khoảng giữ chỗ của mốc cuối cùng.
        var windowStart = candidates.Min(c => c.Start);
        var windowEnd = candidates.Max(c => c.Start).AddMinutes(duration + buffer);

        var shifts = await bookings.ListSpaStaffShiftsAsync(windowStart, windowEnd, ct);
        var held = await bookings.ListHeldBookingsAsync(windowStart, windowEnd, ct);

        var slots = SlotService
            .AvailableSlots(candidates, latestStart, duration, staffRequired, buffer, shifts, held)
            .Select(r => new SpaSlotItem(r.Time, SlotService.GroupOf(r.Time), r.Status))
            .ToList();

        return new SpaSlotsResult(duration, staffRequired, buffer, slots);
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

