using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelCapacityFindFreeCageTests
{
    private static readonly TimeSpan StoreOffset = TimeSpan.FromHours(7);

    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", StoreOffset, "StoreTime", "StoreTime");

    private static DateTimeOffset Local(int day, int hour) =>
        new(2026, 11, day, hour, 0, 0, StoreOffset);

    private static Cage CageOf(string code, bool isActive = true) => new()
    {
        CageId = Guid.NewGuid(),
        Code = code,
        Species = Species.Dog,
        SizeGroup = SizeGroup.Small,
        IsActive = isActive,
    };

    private static HotelAppointment StayIn(Cage cage, int checkInDay, int checkOutDay) => new()
    {
        CageId = cage.CageId,
        PlannedCheckIn = Local(checkInDay, 14),
        PlannedCheckOut = Local(checkOutDay, 12),
    };

    [Fact]
    public void FindFreeCage_WhenNoStay_ReturnsCageWithLowestCode()
    {
        var a1 = CageOf("A1");
        var b2 = CageOf("B2");

        var result = HotelCapacityService.FindFreeCage(
            new[] { b2, a1 }, Array.Empty<HotelAppointment>(), Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(a1.CageId, result?.CageId);
    }

    [Fact]
    public void FindFreeCage_WhenCageOccupiedOnAnyNight_SkipsIt()
    {
        var a1 = CageOf("A1");
        var b2 = CageOf("B2");

        var result = HotelCapacityService.FindFreeCage(
            new[] { a1, b2 }, new[] { StayIn(a1, 11, 13) }, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(b2.CageId, result?.CageId);
    }

    [Fact]
    public void FindFreeCage_WhenAllCagesOccupied_ReturnsNull()
    {
        var a1 = CageOf("A1");
        var b2 = CageOf("B2");
        var stays = new[] { StayIn(a1, 10, 12), StayIn(b2, 11, 13) };

        var result = HotelCapacityService.FindFreeCage(
            new[] { a1, b2 }, stays, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Null(result);
    }

    [Fact]
    public void FindFreeCage_WhenOtherStayChecksOutOnMyCheckInDate_DoesNotCountIt()
    {
        var a1 = CageOf("A1");

        var result = HotelCapacityService.FindFreeCage(
            new[] { a1 }, new[] { StayIn(a1, 8, 10) }, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(a1.CageId, result?.CageId);
    }

    [Fact]
    public void FindFreeCage_WhenOtherStayChecksInOnMyCheckOutDate_DoesNotCountIt()
    {
        var a1 = CageOf("A1");

        var result = HotelCapacityService.FindFreeCage(
            new[] { a1 }, new[] { StayIn(a1, 12, 14) }, Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(a1.CageId, result?.CageId);
    }

    [Fact]
    public void FindFreeCage_WhenCageInactive_SkipsIt()
    {
        var a1 = CageOf("A1", isActive: false);
        var b2 = CageOf("B2");

        var result = HotelCapacityService.FindFreeCage(
            new[] { a1, b2 }, Array.Empty<HotelAppointment>(), Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Equal(b2.CageId, result?.CageId);
    }

    [Fact]
    public void FindFreeCage_WhenCheckOutOnSameDateAsCheckIn_ReturnsNull()
    {
        var result = HotelCapacityService.FindFreeCage(
            new[] { CageOf("A1") }, Array.Empty<HotelAppointment>(), Local(10, 14), Local(10, 18), StoreTimeZone);

        Assert.Null(result);
    }

    [Fact]
    public void FindFreeCage_WhenNoCandidateCage_ReturnsNull()
    {
        var result = HotelCapacityService.FindFreeCage(
            Array.Empty<Cage>(), Array.Empty<HotelAppointment>(), Local(10, 14), Local(12, 12), StoreTimeZone);

        Assert.Null(result);
    }
}