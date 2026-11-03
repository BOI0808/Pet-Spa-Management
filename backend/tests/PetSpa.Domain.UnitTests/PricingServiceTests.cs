using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PricingServiceTests
{
    private static readonly TimeSpan StoreOffset = TimeSpan.FromHours(7);

    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", StoreOffset, "StoreTime", "StoreTime");

    private const decimal FeePerBlock = 50_000m;

    private static readonly Guid BathId = Guid.NewGuid();
    private static readonly Guid TrimId = Guid.NewGuid();

    private static readonly List<ServicePricing> ServicePrices =
    [
        new() { ServiceId = BathId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 100_000m },
        new() { ServiceId = BathId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 150_000m },
        new() { ServiceId = TrimId, Species = Species.Dog, SizeGroup = SizeGroup.Small, Price = 80_000m },
        new() { ServiceId = TrimId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 120_000m },
        new() { ServiceId = BathId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 90_000m },
    ];

    private static readonly List<HotelPricing> HotelPrices =
    [
        new() { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 150_000m, FoodPerNight = 30_000m },
        new() { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100_000m, FoodPerNight = 20_000m },
    ];

    private static DateTimeOffset Local(int day, int hour) =>
        new(2026, 11, day, hour, 0, 0, StoreOffset);

    [Fact]
    public void CalculateSpaAmount_SumsPricesOfAllServicesByGivenSizeGroup()
    {
        var amount = PricingService.CalculateSpaAmount(
            Species.Dog, SizeGroup.Medium, new[] { BathId, TrimId }, ServicePrices);

        Assert.Equal(270_000m, amount);
    }

    [Fact]
    public void CalculateSpaAmount_IgnoresPricesOfOtherSpecies()
    {
        var amount = PricingService.CalculateSpaAmount(
            Species.Cat, SizeGroup.Small, new[] { BathId }, ServicePrices);

        Assert.Equal(90_000m, amount);
    }

    [Fact]
    public void CalculateSpaAmount_WhenPriceMissing_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(() =>
            PricingService.CalculateSpaAmount(
                Species.Dog, SizeGroup.Large, new[] { BathId }, ServicePrices));
    }

    [Theory]
    [InlineData(10, 14, 13, 12, 3)]
    [InlineData(10, 23, 11, 1, 1)]
    [InlineData(10, 0, 11, 23, 1)]
    public void CountNights_CountsStoreLocalDatesBetweenCheckInAndCheckOut(
        int checkInDay, int checkInHour, int checkOutDay, int checkOutHour, int expected)
    {
        var nights = PricingService.CountNights(
            Local(checkInDay, checkInHour), Local(checkOutDay, checkOutHour), StoreTimeZone);

        Assert.Equal(expected, nights);
    }

    [Fact]
    public void CountNights_UsesStoreTimeZoneInsteadOfUtcDate()
    {
        var checkIn = new DateTimeOffset(2026, 11, 10, 20, 0, 0, TimeSpan.Zero);
        var checkOut = new DateTimeOffset(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);

        Assert.Equal(1, PricingService.CountNights(checkIn, checkOut, StoreTimeZone));
    }

    [Theory]
    [InlineData(10, 10, 10, 18)] // Same day
    [InlineData(11, 10, 10, 10)] // CheckOut before CheckIn
    public void CountNights_WhenCheckOutSameOrBeforeCheckIn_ThrowsInvalidOperationException(
        int inDay, int inHour, int outDay, int outHour)
    {
        var checkIn = Local(inDay, inHour);
        var checkOut = Local(outDay, outHour);

        Assert.Throws<InvalidOperationException>(() =>
            PricingService.CountNights(checkIn, checkOut, StoreTimeZone));
    }

    [Fact]
    public void CalculateStayAmount_MultipliesNightsByPriceAndFood()
    {
        var amount = PricingService.CalculateStayAmount(3, Species.Dog, SizeGroup.Small, HotelPrices);

        Assert.Equal(540_000m, amount);
    }

    [Fact]
    public void CalculateStayAmount_WhenPricingMissing_ThrowsInvalidOperationException()
    {
        Assert.Throws<InvalidOperationException>(() =>
            PricingService.CalculateStayAmount(2, Species.Dog, SizeGroup.Large, HotelPrices));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-5)]
    public void CalculateStayAmount_WhenNightsLessThanOrEqualToZero_ThrowsArgumentOutOfRangeException(int nights)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.CalculateStayAmount(nights, Species.Dog, SizeGroup.Small, HotelPrices));
    }

    [Theory]
    [InlineData(-120, 0)]
    [InlineData(0, 0)]
    [InlineData(30, 0)]
    [InlineData(31, 1)]
    [InlineData(90, 1)]
    [InlineData(91, 2)]
    [InlineData(150, 2)]
    [InlineData(151, 3)]
    public void CalculateLateFee_FollowsGraceAndBlockRule(int minutesLate, int expectedBlocks)
    {
        var plannedCheckOut = Local(12, 12);
        var returnedAt = plannedCheckOut.AddMinutes(minutesLate);

        var fee = PricingService.CalculateLateFee(plannedCheckOut, returnedAt, 30, 60, FeePerBlock);

        Assert.Equal(expectedBlocks * FeePerBlock, fee);
    }

    [Fact]
    public void CalculateLateFee_ChargesWhenLateExceedsGraceBySeconds()
    {
        var plannedCheckOut = Local(12, 12);
        var returnedAt = plannedCheckOut.AddMinutes(30).AddSeconds(30);

        var fee = PricingService.CalculateLateFee(plannedCheckOut, returnedAt, 30, 60, FeePerBlock);

        Assert.Equal(FeePerBlock, fee);
    }

    [Theory]
    [InlineData(15, 0)]
    [InlineData(16, 1)]
    [InlineData(45, 1)]
    [InlineData(46, 2)]
    public void CalculateLateFee_UsesGivenGraceAndBlockMinutes(int minutesLate, int expectedBlocks)
    {
        var plannedCheckOut = Local(12, 12);
        var returnedAt = plannedCheckOut.AddMinutes(minutesLate);

        var fee = PricingService.CalculateLateFee(plannedCheckOut, returnedAt, 15, 30, FeePerBlock);

        Assert.Equal(expectedBlocks * FeePerBlock, fee);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-60)]
    public void CalculateLateFee_WhenBlockMinutesZeroOrNegative_ThrowsArgumentOutOfRangeException(int invalidBlockMinutes)
    {
        var plannedCheckOut = Local(12, 12);
        var returnedAt = plannedCheckOut.AddMinutes(60);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.CalculateLateFee(plannedCheckOut, returnedAt, 30, invalidBlockMinutes, FeePerBlock));
    }

    [Fact]
    public void CalculateLateFee_WhenGraceMinutesNegative_ThrowsArgumentOutOfRangeException()
    {
        var plannedCheckOut = Local(12, 12);
        var returnedAt = plannedCheckOut.AddMinutes(60);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.CalculateLateFee(plannedCheckOut, returnedAt, -1, 60, FeePerBlock));
    }

    [Fact]
    public void CalculateLateFee_WhenFeePerBlockNegative_ThrowsArgumentOutOfRangeException()
    {
        var plannedCheckOut = Local(12, 12);
        var returnedAt = plannedCheckOut.AddMinutes(60);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PricingService.CalculateLateFee(plannedCheckOut, returnedAt, 30, 60, -50000m));
    }
}
