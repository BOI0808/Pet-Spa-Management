using PetSpa.Domain.Entities;

namespace PetSpa.Domain.Services;

public static class HotelCapacityService
{
    public static int AvailableCages(
        int activeCages,
        IEnumerable<HotelAppointment> holdingStays,
        DateTimeOffset checkIn,
        DateTimeOffset checkOut,
        TimeZoneInfo storeTimeZone)
    {
        var firstNight = ToStoreDate(checkIn, storeTimeZone);
        var checkOutDate = ToStoreDate(checkOut, storeTimeZone);

        if (checkOutDate <= firstNight)
        {
            return 0;
        }

        var stays = holdingStays
            .Select(s => (
                CheckInDate: ToStoreDate(s.PlannedCheckIn, storeTimeZone),
                CheckOutDate: ToStoreDate(s.PlannedCheckOut, storeTimeZone)))
            .ToList();

        var available = activeCages;
        for (var night = firstNight; night < checkOutDate; night = night.AddDays(1))
        {
            var occupied = stays.Count(s => s.CheckInDate <= night && night < s.CheckOutDate);
            available = Math.Min(available, activeCages - occupied);
        }

        return Math.Max(available, 0);
    }

    public static Cage? FindFreeCage(
        IEnumerable<Cage> candidateCages,
        IEnumerable<HotelAppointment> assignedStays,
        DateTimeOffset checkIn,
        DateTimeOffset checkOut,
        TimeZoneInfo storeTimeZone)
    {
        var firstNight = ToStoreDate(checkIn, storeTimeZone);
        var checkOutDate = ToStoreDate(checkOut, storeTimeZone);

        if (checkOutDate <= firstNight)
        {
            return null;
        }

        var occupiedCageIds = assignedStays
            .Where(s => s.CageId is not null
                && ToStoreDate(s.PlannedCheckIn, storeTimeZone) < checkOutDate
                && firstNight < ToStoreDate(s.PlannedCheckOut, storeTimeZone))
            .Select(s => s.CageId!.Value)
            .ToHashSet();

        return candidateCages
            .Where(c => c.IsActive && !occupiedCageIds.Contains(c.CageId))
            .OrderBy(c => c.Code, StringComparer.Ordinal)
            .FirstOrDefault();
    }

    private static DateOnly ToStoreDate(DateTimeOffset value, TimeZoneInfo storeTimeZone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(value, storeTimeZone).DateTime);
}
