using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelBookingServiceTests
{
    private static readonly TimeSpan StoreOffset = TimeSpan.FromHours(7);
    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", StoreOffset, "StoreTime", "StoreTime");

    private static readonly Guid CustomerUserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();
    private static readonly Guid StaffUserId = Guid.NewGuid();
    private static readonly Guid ManagerUserId = Guid.NewGuid();
    private static readonly Guid CustomerId = Guid.NewGuid();
    private static readonly Guid PetId = Guid.NewGuid();

    private static readonly CurrentUser CustomerUser = new(CustomerUserId, UserRole.Customer);
    private static readonly CurrentUser OtherCustomerUser = new(OtherUserId, UserRole.Customer);
    private static readonly CurrentUser ReceptionistUser = new(StaffUserId, UserRole.Staff);
    private static readonly CurrentUser ManagerUser = new(ManagerUserId, UserRole.Manager);

    private static readonly List<HotelPricing> DefaultPricing =
    [
        new() { Species = Species.Dog, SizeGroup = SizeGroup.Small, PricePerNight = 150_000m, FoodPerNight = 30_000m },
    ];

    private static DateTimeOffset FutureLocal(int daysFromNow, int hour) =>
        DateTimeOffset.UtcNow.AddDays(daysFromNow).Date.AddHours(hour);

    #region Fakes

    private sealed class FakePetRepository : IPetRepository
    {
        public PetWithOwner? PetResult { get; set; }

        public Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(PetResult);

        public Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default) => Task.FromResult<Guid?>(null);
        public Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default) => Task.FromResult(true);
        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<SizeRule>>([]);
        public Task<(IReadOnlyList<Pet> Items, int Total)> ListActiveByCustomerAsync(Guid customerId, int page, int pageSize, CancellationToken ct = default) => Task.FromResult<(IReadOnlyList<Pet>, int)>(([], 0));
        public Task<bool> IsAssignedToStaffAsync(Guid petId, Guid staffUserId, CancellationToken ct = default) => Task.FromResult(false);
        public Task<bool> HasAppointmentsAsync(Guid petId, CancellationToken ct = default) => Task.FromResult(false);
        public void Add(Pet pet) { }
        public void Remove(Pet pet) { }
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeHotelBookingRepository : IHotelBookingRepository
    {
        public bool IsLocked { get; set; }
        public int ActiveCages { get; set; } = 3;
        public List<HotelAppointment> HoldingStays { get; set; } = [];
        public List<HotelAppointment> Added { get; } = [];

        public Task<bool> IsCustomerBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
            Task.FromResult(IsLocked);

        public Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.FromResult(ActiveCages);

        public Task<IReadOnlyList<HotelAppointment>> ListHoldingStaysAsync(
            Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<HotelAppointment>>(HoldingStays);

        public void Add(HotelAppointment appointment) => Added.Add(appointment);
    }

    private sealed class FakeHotelCatalogRepository : IHotelCatalogRepository
    {
        public HotelPricingSnapshot Pricing { get; set; } = new(DefaultPricing, 50_000m);

        public Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default) =>
            Task.FromResult(Pricing);

        public Task AddCageAsync(Cage cage, CancellationToken ct = default) => Task.CompletedTask;
        public Task<bool> UpdateCageAsync(Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) => Task.FromResult(true);
        public Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default) => Task.FromResult(true);
        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) => Task.FromResult<IReadOnlyList<SizeRule>>([]);
        public Task SavePricingAsync(IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeStaffRoleReader : IStaffRoleReader
    {
        public StaffRole? Role { get; set; } = StaffRole.Receptionist;

        public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Role);
    }

    private sealed class FakeTimeZoneProvider(TimeZoneInfo tz) : IStoreTimeZoneProvider
    {
        public TimeZoneInfo GetStoreTimeZone() => tz;
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public bool LockedHotelGroup { get; private set; }

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default)
        {
            LockedHotelGroup = true;
            return Task.CompletedTask;
        }
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion

    private static (HotelBookingService service, FakePetRepository pets, FakeHotelBookingRepository bookings, FakeConcurrencyGuard guard) CreateService()
    {
        var pets = new FakePetRepository
        {
            PetResult = new PetWithOwner(
                new Pet
                {
                    PetId = PetId,
                    CustomerId = CustomerId,
                    Species = Species.Dog,
                    SizeGroup = SizeGroup.Small,
                    IsActive = true,
                },
                CustomerUserId)
        };
        var bookings = new FakeHotelBookingRepository();
        var catalog = new FakeHotelCatalogRepository();
        var staff = new FakeStaffRoleReader();
        var tz = new FakeTimeZoneProvider(StoreTimeZone);
        var guard = new FakeConcurrencyGuard();

        var service = new HotelBookingService(pets, bookings, catalog, staff, tz, guard);
        return (service, pets, bookings, guard);
    }

    // --- CheckAvailabilityAsync Tests ---

    [Fact]
    public async Task CheckAvailability_WhenCheckInInPast_ThrowsValidationError()
    {
        var (service, _, _, _) = CreateService();
        var pastCheckIn = DateTimeOffset.UtcNow.AddDays(-1);
        var checkOut = DateTimeOffset.UtcNow.AddDays(2);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CheckAvailabilityAsync(CustomerUser, PetId, pastCheckIn, checkOut));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public async Task CheckAvailability_WhenCheckOutSameOrBeforeCheckIn_ThrowsValidationError()
    {
        var (service, _, _, _) = CreateService();
        var checkIn = FutureLocal(2, 14);
        var checkOut = FutureLocal(2, 12); // same day earlier hour

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CheckAvailabilityAsync(CustomerUser, PetId, checkIn, checkOut));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public async Task CheckAvailability_WhenPetNotFound_ThrowsNotFound()
    {
        var (service, pets, _, _) = CreateService();
        pets.PetResult = null;

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CheckAvailabilityAsync(CustomerUser, Guid.NewGuid(), FutureLocal(2, 14), FutureLocal(4, 12)));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckAvailability_WhenPetInactive_ThrowsNotFound()
    {
        var (service, pets, _, _) = CreateService();
        pets.PetResult = new PetWithOwner(
            new Pet { PetId = PetId, CustomerId = CustomerId, IsActive = false }, CustomerUserId);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CheckAvailabilityAsync(CustomerUser, PetId, FutureLocal(2, 14), FutureLocal(4, 12)));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckAvailability_WhenCustomerNotOwner_ThrowsForbidden()
    {
        var (service, _, _, _) = CreateService();

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CheckAvailabilityAsync(OtherCustomerUser, PetId, FutureLocal(2, 14), FutureLocal(4, 12)));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task CheckAvailability_WhenValidAndCapacityAvailable_ReturnsAvailableTrueWithNightsAndAmount()
    {
        var (service, _, _, _) = CreateService();
        var checkIn = FutureLocal(2, 14);
        var checkOut = FutureLocal(5, 12); // 3 nights

        var result = await service.CheckAvailabilityAsync(CustomerUser, PetId, checkIn, checkOut);

        Assert.True(result.Available);
        Assert.Equal(3, result.Nights);
        Assert.Equal(3 * (150_000m + 30_000m), result.EstimatedAmount);
    }

    [Fact]
    public async Task CheckAvailability_WhenNoCapacity_ReturnsAvailableFalse()
    {
        var (service, _, bookings, _) = CreateService();
        bookings.ActiveCages = 0; // No cages

        var result = await service.CheckAvailabilityAsync(CustomerUser, PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        Assert.False(result.Available);
    }

    // --- CreateAsync Tests ---

    [Fact]
    public async Task CreateAsync_WhenCheckInInPast_ThrowsValidationError()
    {
        var (service, _, _, _) = CreateService();
        var input = new HotelBookingInput(PetId, DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(2));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateAsync(CustomerUser, input, null));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhenManagerCalls_ThrowsForbidden()
    {
        var (service, _, _, _) = CreateService();
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateAsync(ManagerUser, input, null));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhenCustomerIsBookingLocked_ThrowsBookingLocked()
    {
        var (service, _, bookings, _) = CreateService();
        bookings.IsLocked = true;
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateAsync(CustomerUser, input, null));

        Assert.Equal(ErrorCodes.BookingLocked, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhenReceptionistMissingCustomerId_ThrowsValidationError()
    {
        var (service, _, _, _) = CreateService();
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateAsync(ReceptionistUser, input, null));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhenReceptionistPassesMismatchedCustomerId_ThrowsValidationError()
    {
        var (service, _, _, _) = CreateService();
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateAsync(ReceptionistUser, input, Guid.NewGuid()));

        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhenReceptionistBooksForLockedCustomer_Succeeds()
    {
        var (service, _, bookings, guard) = CreateService();
        bookings.IsLocked = true; // Customer is locked, but receptionist is allowed (BR-15)
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        var result = await service.CreateAsync(ReceptionistUser, input, CustomerId);

        Assert.Equal(AppointmentStatus.Pending, result.Status);
        Assert.Single(bookings.Added);
        Assert.True(guard.LockedHotelGroup);
    }

    [Fact]
    public async Task CreateAsync_WhenNoCapacity_ThrowsNoCapacity()
    {
        var (service, _, bookings, _) = CreateService();
        bookings.ActiveCages = 0;
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(4, 12));

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateAsync(CustomerUser, input, null));

        Assert.Equal(ErrorCodes.NoCapacity, ex.Code);
    }

    [Fact]
    public async Task CreateAsync_WhenValidCustomerRequest_CreatesPendingAppointmentAndLocksGroup()
    {
        var (service, _, bookings, guard) = CreateService();
        var input = new HotelBookingInput(PetId, FutureLocal(2, 14), FutureLocal(5, 12)); // 3 nights

        var result = await service.CreateAsync(CustomerUser, input, null);

        Assert.Equal(AppointmentStatus.Pending, result.Status);
        Assert.Equal(3, result.Nights);
        Assert.Equal(3 * (150_000m + 30_000m), result.EstimatedAmount);
        Assert.True(guard.LockedHotelGroup);

        var saved = Assert.Single(bookings.Added);
        Assert.Equal(CustomerId, saved.CustomerId);
        Assert.Equal(PetId, saved.PetId);
        Assert.Equal(SizeGroup.Small, saved.SizeGroup);
        Assert.Null(saved.CageId);
    }
}

