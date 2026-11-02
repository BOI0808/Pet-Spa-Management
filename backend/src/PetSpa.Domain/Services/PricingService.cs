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

        return checkOutDate.DayNumber - checkInDate.DayNumber;
    }

    public static decimal CalculateStayAmount(
        int nights,
        Species species,
        SizeGroup sizeGroup,
        IReadOnlyCollection<HotelPricing> pricing)
    {
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
        var excess = returnedAt - plannedCheckOut - TimeSpan.FromMinutes(graceMinutes);
        if (excess <= TimeSpan.Zero) return 0m;

        var blocks = Math.Ceiling(excess / TimeSpan.FromMinutes(blockMinutes));
        return (decimal)blocks * feePerBlock;
    }
}