using PetSpa.Domain.Entities;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelCapacityServiceTests
{
    private static readonly TimeSpan StoreOffset = TimeSpan.FromHours(7);

    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", StoreOffset, "StoreTime", "StoreTime");

    private static DateTimeOffset Local(int day, int hour) =>
        new(2026, 11, day, hour, 0, 0, StoreOffset);

    private static HotelAppointment Stay(int checkInDay, int checkOutDay) => new()
    {
        PlannedCheckIn = Local(checkInDay, 14),
        PlannedCheckOut = Local(checkOutDay, 12),
    };

    [Fact]
    public void AvailableCages_WhenNoStayHolding_ReturnsAllActiveCages()
    {
        var available = HotelCapacityService.AvailableCages(
            3, Array.Empty<HotelAppointment>(), Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(3, available);
    }

    [Fact]
    public void AvailableCages_WhenOneStayOverlapsOneNight_ReturnsOneLess()
    {
        var available = HotelCapacityService.AvailableCages(
            3, new[] { Stay(11, 13) }, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(2, available);
    }

    [Fact]
    public void AvailableCages_ReturnsValueOfTheBusiestNight()
    {
        var stays = new[] { Stay(11, 12), Stay(11, 13) };

        var available = HotelCapacityService.AvailableCages(
            2, stays, Local(10, 14), Local(13, 12), StoreTimeZone);

        Assert.Equal(0, available);
    }

    [Fact]
    public void AvailableCages_WhenOtherStayChecksOutOnMyCheckInDate_DoesNotCountIt()
    {
        var available = HotelCapacityService.AvailableCages(
            3, new[] { Stay(8, 10) }, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(3, available);
    }

    [Fact]
    public void AvailableCages_WhenOtherStayChecksInOnMyCheckOutDate_DoesNotCountIt()
    {
        var available = HotelCapacityService.AvailableCages(
            3, new[] { Stay(12, 14) }, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(3, available);
    }

    [Fact]
    public void AvailableCages_ConvertsStayDatesToStoreTimeZone()
    {
        var stay = new HotelAppointment
        {
            PlannedCheckIn = new DateTimeOffset(2026, 11, 9, 18, 0, 0, TimeSpan.Zero),
            PlannedCheckOut = new DateTimeOffset(2026, 11, 12, 5, 0, 0, TimeSpan.Zero),
        };

        var available = HotelCapacityService.AvailableCages(
            1, new[] { stay }, Local(9, 14), Local(10, 12), StoreTimeZone);

        Assert.Equal(1, available);
    }

    [Fact]
    public void AvailableCages_WhenNoActiveCage_ReturnsZero()
    {
        var available = HotelCapacityService.AvailableCages(
            0, Array.Empty<HotelAppointment>(), Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(0, available);
    }

    [Fact]
    public void AvailableCages_WhenStaysExceedCages_ReturnsZeroNotNegative()
    {
        var stays = new[] { Stay(10, 12), Stay(10, 12) };

        var available = HotelCapacityService.AvailableCages(
            1, stays, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(0, available);
    }

    [Theory]
    [InlineData(10, 14, 10, 18)] // Same day
    [InlineData(12, 14, 10, 12)] // CheckOut before CheckIn
    public void AvailableCages_WhenCheckOutSameOrBeforeCheckIn_ReturnsZero(
        int inDay, int inHour, int outDay, int outHour)
    {
        var available = HotelCapacityService.AvailableCages(
            3, Array.Empty<HotelAppointment>(), Local(inDay, inHour), Local(outDay, outHour), StoreTimeZone);

        Assert.Equal(0, available);
    }
}
