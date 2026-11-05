namespace PetSpa.Application.Common;

// Múi giờ của cửa hàng. Mốc giờ đặt lịch là giờ địa phương, cơ sở dữ liệu lưu UTC.
public sealed class ShopTimeZone(TimeZoneInfo zone)
{
    public DateTimeOffset ToUtc(DateOnly date, TimeOnly time)
    {
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);
        return new DateTimeOffset(local, zone.GetUtcOffset(local)).ToUniversalTime();
    }

    // Ngược lại với ToUtc: ngày và giờ địa phương của cửa hàng tại một thời điểm.
    public (DateOnly Date, TimeOnly Time) ToLocal(DateTimeOffset instant)
    {
        var local = TimeZoneInfo.ConvertTime(instant, zone).DateTime;
        return (DateOnly.FromDateTime(local), TimeOnly.FromDateTime(local));
    }
}

