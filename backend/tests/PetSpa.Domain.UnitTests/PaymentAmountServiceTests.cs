using PetSpa.Application.Ports;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PaymentAmountServiceTests
{
    private static readonly TimeSpan StoreOffset = TimeSpan.FromHours(7);
    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", StoreOffset, "StoreTime", "StoreTime");

    private static readonly Guid BathId = Guid.NewGuid();
    private static readonly Guid TrimId = Guid.NewGuid();

    private static readonly List<ServicePricing> SampleServicePricing =
    [
        new() { ServiceId = BathId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 150_000m },
        new() { ServiceId = TrimId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 120_000m },
    ];

    private static readonly List<HotelPricing> SampleHotelPricing =
    [
        new() { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 200_000m, FoodPerNight = 50_000m },
    ];

    private static readonly LateFeeConfig DefaultLateFeeConfig = new(30, 60, 50_000m);

    private sealed class FakePaymentAmountRepository : IPaymentAmountRepository
    {
        public SpaAmountSnapshot? SpaSnapshot { get; set; }
        public StayAmountSnapshot? StaySnapshot { get; set; }
        public LateFeeConfig LateFeeConfig { get; set; } = DefaultLateFeeConfig;

        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(SpaSnapshot);

        public Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(StaySnapshot);

        public Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default) =>
            Task.FromResult(LateFeeConfig);
    }

    private sealed class FakeHotelCatalogRepository : IHotelCatalogRepository
    {
        public HotelPricingSnapshot PricingSnapshot { get; set; } =
            new(SampleHotelPricing, 50_000m);

        public Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default) =>
            Task.FromResult(PricingSnapshot);

        public Task AddCageAsync(Cage cage, CancellationToken ct = default) => Task.CompletedTask;
        public Task<bool> UpdateCageAsync(Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) => Task.FromResult(true);
        public Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default) => Task.FromResult(true);
        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<SizeRule>>([]);
        public Task SavePricingAsync(IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeTimeZoneProvider(TimeZoneInfo tz) : IStoreTimeZoneProvider
    {
        public TimeZoneInfo GetStoreTimeZone() => tz;
    }

    // --- DetermineSpaAmountAsync Tests ---

    [Fact]
    public async Task DetermineSpaAmountAsync_WhenNotFound_ThrowsNotFound()
    {
        var repo = new FakePaymentAmountRepository { SpaSnapshot = null };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.DetermineSpaAmountAsync(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task DetermineSpaAmountAsync_WhenStatusNotCompleted_ThrowsPaymentNotDue(AppointmentStatus status)
    {
        var repo = new FakePaymentAmountRepository
        {
            SpaSnapshot = new SpaAmountSnapshot(
                Species.Dog,
                SizeGroup.Medium,
                status,
                new[] { BathId },
                SampleServicePricing)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.DetermineSpaAmountAsync(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
    }

    [Fact]
    public async Task DetermineSpaAmountAsync_WhenCompleted_ReturnsCalculatedAmount()
    {
        var repo = new FakePaymentAmountRepository
        {
            SpaSnapshot = new SpaAmountSnapshot(
                Species.Dog,
                SizeGroup.Medium,
                AppointmentStatus.Completed,
                new[] { BathId, TrimId },
                SampleServicePricing)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var amount = await service.DetermineSpaAmountAsync(Guid.NewGuid());

        Assert.Equal(270_000m, amount);
    }

    // --- DetermineStayAmountAsync Tests ---

    [Fact]
    public async Task DetermineStayAmountAsync_WhenNotFound_ThrowsNotFound()
    {
        var repo = new FakePaymentAmountRepository { StaySnapshot = null };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.DetermineStayAmountAsync(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task DetermineStayAmountAsync_WhenStatusNotConfirmed_ThrowsPaymentNotDue(AppointmentStatus status)
    {
        var repo = new FakePaymentAmountRepository
        {
            StaySnapshot = new StayAmountSnapshot(
                Species.Dog,
                SizeGroup.Small,
                status,
                new DateTimeOffset(2026, 11, 10, 14, 0, 0, StoreOffset),
                new DateTimeOffset(2026, 11, 12, 12, 0, 0, StoreOffset),
                null)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.DetermineStayAmountAsync(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
    }

    [Fact]
    public async Task DetermineStayAmountAsync_WhenConfirmed_ReturnsCalculatedAmount()
    {
        var repo = new FakePaymentAmountRepository
        {
            StaySnapshot = new StayAmountSnapshot(
                Species.Dog,
                SizeGroup.Small,
                AppointmentStatus.Confirmed,
                new DateTimeOffset(2026, 11, 10, 14, 0, 0, StoreOffset),
                new DateTimeOffset(2026, 11, 12, 12, 0, 0, StoreOffset),
                null)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var amount = await service.DetermineStayAmountAsync(Guid.NewGuid());

        // 2 nights * (200k + 50k) = 500,000 VND
        Assert.Equal(500_000m, amount);
    }

    // --- DetermineLateFeeAsync Tests ---

    [Fact]
    public async Task DetermineLateFeeAsync_WhenNotFound_ThrowsNotFound()
    {
        var repo = new FakePaymentAmountRepository { StaySnapshot = null };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.DetermineLateFeeAsync(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task DetermineLateFeeAsync_WhenStatusNotInStay_ThrowsPaymentNotDue(AppointmentStatus status)
    {
        var repo = new FakePaymentAmountRepository
        {
            StaySnapshot = new StayAmountSnapshot(
                Species.Dog,
                SizeGroup.Small,
                status,
                new DateTimeOffset(2026, 11, 10, 14, 0, 0, StoreOffset),
                new DateTimeOffset(2026, 11, 12, 12, 0, 0, StoreOffset),
                null)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.DetermineLateFeeAsync(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.PaymentNotDue, ex.Code);
    }

    [Fact]
    public async Task DetermineLateFeeAsync_WhenInStay_PrioritizesActualCheckOut()
    {
        var plannedCheckOut = new DateTimeOffset(2026, 11, 12, 12, 0, 0, StoreOffset);
        var actualCheckOut = plannedCheckOut.AddMinutes(90); // 90 min late: 30 grace -> 60 excess -> 1 block * 50k
        var passedReturnedAt = plannedCheckOut.AddMinutes(150); // 150 min late: should be IGNORED because ActualCheckOut is present

        var repo = new FakePaymentAmountRepository
        {
            StaySnapshot = new StayAmountSnapshot(
                Species.Dog,
                SizeGroup.Small,
                AppointmentStatus.InStay,
                plannedCheckOut.AddDays(-2),
                plannedCheckOut,
                actualCheckOut)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var fee = await service.DetermineLateFeeAsync(Guid.NewGuid(), passedReturnedAt);

        Assert.Equal(50_000m, fee);
    }

    [Fact]
    public async Task DetermineLateFeeAsync_WhenInStayAndActualCheckOutNull_UsesReturnedAt()
    {
        var plannedCheckOut = new DateTimeOffset(2026, 11, 12, 12, 0, 0, StoreOffset);
        var passedReturnedAt = plannedCheckOut.AddMinutes(91); // 91 min late: 30 grace -> 61 excess -> 2 blocks * 50k = 100k

        var repo = new FakePaymentAmountRepository
        {
            StaySnapshot = new StayAmountSnapshot(
                Species.Dog,
                SizeGroup.Small,
                AppointmentStatus.InStay,
                plannedCheckOut.AddDays(-2),
                plannedCheckOut,
                null)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var fee = await service.DetermineLateFeeAsync(Guid.NewGuid(), passedReturnedAt);

        Assert.Equal(100_000m, fee);
    }

    [Fact]
    public async Task DetermineLateFeeAsync_WhenLateWithinGrace_ReturnsZero()
    {
        var plannedCheckOut = new DateTimeOffset(2026, 11, 12, 12, 0, 0, StoreOffset);
        var passedReturnedAt = plannedCheckOut.AddMinutes(25); // 25 min late <= 30 grace

        var repo = new FakePaymentAmountRepository
        {
            StaySnapshot = new StayAmountSnapshot(
                Species.Dog,
                SizeGroup.Small,
                AppointmentStatus.InStay,
                plannedCheckOut.AddDays(-2),
                plannedCheckOut,
                null)
        };
        var service = new PaymentAmountService(repo, new FakeHotelCatalogRepository(), new FakeTimeZoneProvider(StoreTimeZone));

        var fee = await service.DetermineLateFeeAsync(Guid.NewGuid(), passedReturnedAt);

        Assert.Equal(0m, fee);
    }
}
