using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

public static class PricingService
{
    public static decimal CalculateSpaAmount(
        Species species,
        SizeGroup sizeGroup,
        IEnumerable<Guid> serviceIds,
        IReadOnlyCollection<ServicePricing> pricing)
    {
        var total = 0m;
        foreach (var serviceId in serviceIds)
        {
            var row = pricing.FirstOrDefault(p =>
                    p.ServiceId == serviceId && p.Species == species && p.SizeGroup == sizeGroup)
                ?? throw new InvalidOperationException(
                    $"Thiếu giá của dịch vụ {serviceId} cho loài {species}, nhóm kích cỡ {sizeGroup}.");

            total += row.Price;
        }

        return total;
    }

    public static int CountNights(DateTimeOffset checkIn, DateTimeOffset checkOut, TimeZoneInfo storeTimeZone)
    {
        var checkInDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(checkIn, storeTimeZone).DateTime);
        var checkOutDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(checkOut, storeTimeZone).DateTime);

        if (checkOutDate <= checkInDate)
        {
            throw new InvalidOperationException("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");
        }

        return checkOutDate.DayNumber - checkInDate.DayNumber;
    }

    public static decimal CalculateStayAmount(
        int nights,
        Species species,
        SizeGroup sizeGroup,
        IReadOnlyCollection<HotelPricing> pricing)
    {
        if (nights <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(nights), "Số đêm lưu trú phải lớn hơn 0.");
        }

        var row = pricing.FirstOrDefault(p => p.Species == species && p.SizeGroup == sizeGroup)
            ?? throw new InvalidOperationException(
                $"Thiếu giá lưu trú của loài {species}, nhóm kích cỡ {sizeGroup}.");

        return nights * (row.PricePerNight + row.FoodPerNight);
    }

    public static decimal CalculateLateFee(
        DateTimeOffset plannedCheckOut,
        DateTimeOffset returnedAt,
        int graceMinutes,
        int blockMinutes,
        decimal feePerBlock)
    {
        if (blockMinutes <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(blockMinutes), "Block thời gian tính phí phạt phải lớn hơn 0.");
        }

        if (graceMinutes < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(graceMinutes), "Thời gian ân hạn không được âm.");
        }

        if (feePerBlock < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(feePerBlock), "Mức phí mỗi block không được âm.");
        }

        var excess = returnedAt - plannedCheckOut - TimeSpan.FromMinutes(graceMinutes);
        if (excess <= TimeSpan.Zero) return 0m;

        var blocks = Math.Ceiling(excess / TimeSpan.FromMinutes(blockMinutes));
        return (decimal)blocks * feePerBlock;
    }
}
