using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Ports;

// Dịch vụ đang cung cấp, có dòng giá cho đúng loài và nhóm kích cỡ của thú cưng.
public sealed record BookableService(Guid ServiceId, TimeOnly LatestStartTime, int DurationMinutes, int StaffRequired);

// Port truy vấn dữ liệu đặt lịch. Các thời điểm truyền vào đã ở UTC.
public interface IBookingRepository
{
    // Chỉ trả dịch vụ đang kích hoạt và có giá cho (species, sizeGroup); dịch vụ không thỏa thì không có trong kết quả.
    Task<IReadOnlyList<BookableService>> FindBookableServicesAsync(
        IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default);

    Task<int> GetBufferMinutesAsync(CancellationToken ct = default);

    // Ca làm của nhân viên spa đang hoạt động, giao với khoảng [from, to).
    Task<IReadOnlyList<StaffShift>> ListSpaStaffShiftsAsync(
        DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);

    // Lịch spa đang giữ chỗ (Pending, Confirmed, Received, InProgress), có khoảng bận giao với [from, to).
    Task<IReadOnlyList<HeldBooking>> ListHeldBookingsAsync(
        DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);
}

