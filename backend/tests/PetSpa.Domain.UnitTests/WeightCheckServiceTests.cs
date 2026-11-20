using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Domain.UnitTests;

public sealed class WeightCheckServiceTests
{
    private static readonly Guid PetId = Guid.NewGuid();
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid ServiceId = Guid.NewGuid();
    private static readonly TimeZoneInfo StoreTz = TimeZoneInfo.Utc;

    private static readonly IReadOnlyList<SizeRule> CatRules =
    [
        new SizeRule { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3.0m, MediumUpper = 5.0m }
    ];

    private static readonly IReadOnlyList<WeightTolerance> CatTolerances =
    [
        new WeightTolerance { Species = Species.Cat, FromGroup = SizeGroup.Small, ToGroup = SizeGroup.Medium, ToleranceKg = 0.5m }
    ];

    private static readonly IReadOnlyList<HotelPricing> HotelPrices =
    [
        new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Small, PricePerNight = 100000m, FoodPerNight = 20000m },
        new HotelPricing { Species = Species.Cat, SizeGroup = SizeGroup.Medium, PricePerNight = 150000m, FoodPerNight = 30000m }
    ];

    #region Fakes

    private sealed class FakePetRepository : IPetRepository
    {
        public Pet? Pet { get; set; }
        public IReadOnlyList<SizeRule> SizeRules { get; set; } = CatRules;
        public IReadOnlyList<WeightTolerance> Tolerances { get; set; } = CatTolerances;

        public Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Pet is null ? null : new PetWithOwner(Pet, null));

        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) =>
            Task.FromResult(SizeRules);

        public Task<IReadOnlyList<WeightTolerance>> GetWeightTolerancesAsync(Species species, CancellationToken ct = default) =>
            Task.FromResult(Tolerances);

        public Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<(IReadOnlyList<Pet> Items, int Total)> ListActiveByCustomerAsync(Guid customerId, int page, int pageSize, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> IsAssignedToStaffAsync(Guid petId, Guid staffUserId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> HasAppointmentsAsync(Guid petId, CancellationToken ct = default) => throw new NotImplementedException();
        public void Add(Pet pet) => throw new NotImplementedException();
        public void Remove(Pet pet) => throw new NotImplementedException();
        public Task SaveChangesAsync(CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakePaymentAmountRepository : IPaymentAmountRepository
    {
        public SpaAmountSnapshot? SpaSnapshot { get; set; }

        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(SpaSnapshot);

        public Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeBookingRepository : IBookingRepository
    {
        public Dictionary<SizeGroup, IReadOnlyList<ServicePricing>> PricingByGroup { get; set; } = [];

        public Task<IReadOnlyList<BookableService>> FindBookableServicesAsync(
            IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetBufferMinutesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffShift>> ListSpaStaffShiftsAsync(
            DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<HeldBooking>> ListHeldBookingsAsync(
            DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<ServicePricing>> ListPricingAsync(
            IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.FromResult(PricingByGroup.TryGetValue(sizeGroup, out var list) ? list : (IReadOnlyList<ServicePricing>)[]);

        public void AddSpaAppointment(SpaAppointment appointment, IReadOnlyList<Guid> serviceIds) =>
            throw new NotImplementedException();

        public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<AppointmentListItem>> ListAppointmentsAsync(
            AppointmentType? type, AppointmentStatus? status, DateOnly? date, AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public Appointment? Appointment { get; set; }
        public Species Species { get; set; } = Species.Cat;
        public Cage? Cage { get; set; }

        public Task<Appointment?> FindAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Appointment is HotelAppointment stay ? new HotelAppointmentWithSpecies(stay, Species) : null);

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) => Task.FromResult(Cage);
        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> IsCageOccupiedAsync(Guid cageId, Guid currentAppointmentId, CancellationToken ct = default) =>
            Task.FromResult(false);
    }

    private sealed class FakeHotelCatalogRepository : IHotelCatalogRepository
    {
        public HotelPricingSnapshot Snapshot { get; set; } = new(HotelPrices, 50000m);

        public Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default) =>
            Task.FromResult(Snapshot);

        public Task AddCageAsync(Cage cage, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> UpdateCageAsync(Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<PagedResult<CageStatus>> ListCagesAsync(int page, int pageSize, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public Task SavePricingAsync(IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakeStoreTimeZoneProvider : IStoreTimeZoneProvider
    {
        public TimeZoneInfo GetStoreTimeZone() => StoreTz;
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Guid? LockedAppointmentId { get; private set; }

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            LockedAppointmentId = appointmentId;
            return Task.CompletedTask;
        }
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion

    private static (WeightCheckService Sut, FakePetRepository Pets, FakePaymentAmountRepository PaymentAmounts,
        FakeBookingRepository Bookings, FakeHotelAssignmentRepository HotelAssignments, FakeConcurrencyGuard Guard)
        CreateSut(
            Pet? pet = null,
            SpaAmountSnapshot? spaSnapshot = null,
            Appointment? appointment = null,
            Cage? cage = null,
            FakeCostConfirmationRepository? costConfirmations = null)
    {
        var pets = new FakePetRepository { Pet = pet };
        var paymentAmounts = new FakePaymentAmountRepository { SpaSnapshot = spaSnapshot };
        var bookings = new FakeBookingRepository();
        var hotelAssignments = new FakeHotelAssignmentRepository { Appointment = appointment, Cage = cage };
        var hotelCatalog = new FakeHotelCatalogRepository();
        var timeZoneProvider = new FakeStoreTimeZoneProvider();
        var guard = new FakeConcurrencyGuard();

        var sut = new WeightCheckService(
            pets,
            paymentAmounts,
            bookings,
            hotelAssignments,
            hotelCatalog,
            costConfirmations ?? new FakeCostConfirmationRepository(),
            timeZoneProvider,
            guard);

        return (sut, pets, paymentAmounts, bookings, hotelAssignments, guard);
    }

    #region Spa Tests

    [Fact]
    public async Task RecordForSpaAsync_WhenWeightWithinCurrentGroup_ReturnsOkAndUpdatesPetAndAppointment()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet);

        var outcome = await sut.RecordForSpaAsync(appt, 2.8m);

        Assert.Equal(WeightCheckResult.OK, outcome.Result);
        Assert.Null(outcome.NewSizeGroup);
        Assert.Null(outcome.OldAmount);
        Assert.Null(outcome.NewAmount);
        Assert.Equal(2.8m, appt.ActualWeightKg);
        Assert.Equal(SizeGroup.Small, appt.SizeGroup);
        Assert.Equal(2.8m, pet.WeightKg);
        Assert.Equal(SizeGroup.Small, pet.SizeGroup);
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenWithinTolerance_ReturnsOkAndUpdatesPetToNewGroup()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet);

        var outcome = await sut.RecordForSpaAsync(appt, 3.3m);

        Assert.Equal(WeightCheckResult.OK, outcome.Result);
        Assert.Null(outcome.NewSizeGroup);
        Assert.Equal(3.3m, appt.ActualWeightKg);
        Assert.Equal(SizeGroup.Small, appt.SizeGroup); // Appointment retains Small
        Assert.Equal(3.3m, pet.WeightKg);
        Assert.Equal(SizeGroup.Medium, pet.SizeGroup); // Pet updated to Medium
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenPriceDecreased_LowersAppointmentGroupAndUpdatesPetAndRecalculatesPrice()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 4.0m, SizeGroup = SizeGroup.Medium };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Medium };
        var spaSnapshot = new SpaAmountSnapshot(
            Species.Cat,
            SizeGroup.Medium,
            AppointmentStatus.Confirmed,
            [ServiceId],
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 150000m }]);

        var (sut, _, _, bookings, _, _) = CreateSut(pet: pet, spaSnapshot: spaSnapshot);
        bookings.PricingByGroup[SizeGroup.Small] =
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m }];

        var outcome = await sut.RecordForSpaAsync(appt, 2.9m);

        Assert.Equal(WeightCheckResult.PRICE_DECREASED, outcome.Result);
        Assert.Equal(SizeGroup.Small, outcome.NewSizeGroup);
        Assert.Equal(150000m, outcome.OldAmount);
        Assert.Equal(100000m, outcome.NewAmount);
        Assert.Equal(2.9m, appt.ActualWeightKg);
        Assert.Equal(SizeGroup.Small, appt.SizeGroup); // Appointment group lowered to Small
        Assert.Equal(2.9m, pet.WeightKg);
        Assert.Equal(SizeGroup.Small, pet.SizeGroup); // Pet group lowered to Small
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenNeedsConfirmation_KeepsAppointmentAndPetGroupAndCalculatesPrice()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var spaSnapshot = new SpaAmountSnapshot(
            Species.Cat,
            SizeGroup.Small,
            AppointmentStatus.Confirmed,
            [ServiceId],
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m }]);

        var (sut, _, _, bookings, _, _) = CreateSut(pet: pet, spaSnapshot: spaSnapshot);
        bookings.PricingByGroup[SizeGroup.Medium] =
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 150000m }];

        var outcome = await sut.RecordForSpaAsync(appt, 3.4m);

        Assert.Equal(WeightCheckResult.NEEDS_CONFIRMATION, outcome.Result);
        Assert.Equal(SizeGroup.Medium, outcome.NewSizeGroup);
        Assert.Equal(100000m, outcome.OldAmount);
        Assert.Equal(150000m, outcome.NewAmount);
        Assert.Equal(3.4m, appt.ActualWeightKg);
        Assert.Equal(SizeGroup.Small, appt.SizeGroup); // Appointment group remains Small
        Assert.Equal(2.8m, pet.WeightKg); // Pet profile unchanged
        Assert.Equal(SizeGroup.Small, pet.SizeGroup);
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenPetNotFound_ThrowsNotFound()
    {
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var (sut, _, _, _, _, _) = CreateSut(pet: null);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.RecordForSpaAsync(appt, 2.8m));
        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenSnapshotNotFound_ThrowsNotFound()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, spaSnapshot: null);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.RecordForSpaAsync(appt, 3.4m));
        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenNewSizeGroupPriceMissing_ThrowsValidationError()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var spaSnapshot = new SpaAmountSnapshot(
            Species.Cat,
            SizeGroup.Small,
            AppointmentStatus.Confirmed,
            [ServiceId],
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m }]);

        var (sut, _, _, bookings, _, _) = CreateSut(pet: pet, spaSnapshot: spaSnapshot);
        // Do not provide pricing for SizeGroup.Medium
        bookings.PricingByGroup[SizeGroup.Medium] = [];

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.RecordForSpaAsync(appt, 3.4m));
        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
        Assert.Equal("Có dịch vụ không áp dụng cho nhóm kích cỡ mới của thú cưng.", ex.Message);
    }

    #endregion

    #region Hotel Tests

    [Fact]
    public async Task CheckHotelAsync_WhenWeightOk_ReturnsOkAndUpdatesPetAndKeepsAppointmentConfirmed()
    {
        var checkIn = DateTimeOffset.UtcNow.AddDays(1);
        var checkOut = checkIn.AddDays(2);
        var stay = new HotelAppointment
        {
            AppointmentId = AppointmentId,
            PetId = PetId,
            Status = AppointmentStatus.Confirmed,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkOut
        };
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var (sut, _, _, _, _, guard) = CreateSut(pet: pet, appointment: stay);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 3.2m);

        Assert.Equal(WeightCheckResult.OK, outcome.Result);
        Assert.Null(outcome.NewSizeGroup);
        Assert.Null(outcome.OldAmount);
        Assert.Null(outcome.NewAmount);
        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
        Assert.Equal(3.2m, stay.ActualWeightKg);
        Assert.Equal(SizeGroup.Small, stay.SizeGroup);
        Assert.Equal(3.2m, pet.WeightKg);
        Assert.Equal(SizeGroup.Medium, pet.SizeGroup);
        Assert.Equal(AppointmentId, guard.LockedAppointmentId);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenPriceDecreased_LowersAppointmentGroupAndUpdatesPetAndRecalculatesStayAmount()
    {
        var checkIn = DateTimeOffset.UtcNow.AddDays(1);
        var checkOut = checkIn.AddDays(2);
        var stay = new HotelAppointment
        {
            AppointmentId = AppointmentId,
            PetId = PetId,
            Status = AppointmentStatus.Confirmed,
            SizeGroup = SizeGroup.Medium,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkOut
        };
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 4.0m, SizeGroup = SizeGroup.Medium };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 2.9m);

        Assert.Equal(WeightCheckResult.PRICE_DECREASED, outcome.Result);
        Assert.Equal(SizeGroup.Small, outcome.NewSizeGroup);
        // 2 nights: Medium = 2 * 180k = 360k, Small = 2 * 120k = 240k
        Assert.Equal(360000m, outcome.OldAmount);
        Assert.Equal(240000m, outcome.NewAmount);
        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
        Assert.Equal(SizeGroup.Small, stay.SizeGroup);
        Assert.Equal(2.9m, stay.ActualWeightKg);
        Assert.Equal(2.9m, pet.WeightKg);
        Assert.Equal(SizeGroup.Small, pet.SizeGroup);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenNeedsConfirmation_KeepsAppointmentAndPetAndRecalculatesStayAmount()
    {
        var checkIn = DateTimeOffset.UtcNow.AddDays(1);
        var checkOut = checkIn.AddDays(2);
        var stay = new HotelAppointment
        {
            AppointmentId = AppointmentId,
            PetId = PetId,
            Status = AppointmentStatus.Confirmed,
            SizeGroup = SizeGroup.Small,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkOut
        };
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 3.4m);

        Assert.Equal(WeightCheckResult.NEEDS_CONFIRMATION, outcome.Result);
        Assert.Equal(SizeGroup.Medium, outcome.NewSizeGroup);
        // 2 nights: Small = 2 * 120k = 240k, Medium = 2 * 180k = 360k
        Assert.Equal(240000m, outcome.OldAmount);
        Assert.Equal(360000m, outcome.NewAmount);
        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
        Assert.Equal(SizeGroup.Small, stay.SizeGroup);
        Assert.Equal(3.4m, stay.ActualWeightKg);
        Assert.Equal(2.8m, pet.WeightKg);
        Assert.Equal(SizeGroup.Small, pet.SizeGroup);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var (sut, _, _, _, _, _) = CreateSut(appointment: null);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckHotelAsync(AppointmentId, 3.2m));
        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenAppointmentIsSpa_ThrowsInvalidTransition()
    {
        var spaAppt = new SpaAppointment
        {
            AppointmentId = AppointmentId,
            Status = AppointmentStatus.Confirmed
        };
        var (sut, _, _, _, _, _) = CreateSut(appointment: spaAppt);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckHotelAsync(AppointmentId, 3.2m));
        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenAppointmentNotConfirmed_ThrowsInvalidTransition()
    {
        var stay = new HotelAppointment
        {
            AppointmentId = AppointmentId,
            Status = AppointmentStatus.Pending
        };
        var (sut, _, _, _, _, _) = CreateSut(appointment: stay);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckHotelAsync(AppointmentId, 3.2m));
        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    #endregion

    #region Cost Confirmation Tests

    private static HotelAppointment ConfirmedStay(SizeGroup sizeGroup, Guid? cageId = null)
    {
        var checkIn = DateTimeOffset.UtcNow.AddDays(1);
        return new HotelAppointment
        {
            AppointmentId = AppointmentId,
            PetId = PetId,
            Status = AppointmentStatus.Confirmed,
            SizeGroup = sizeGroup,
            PlannedCheckIn = checkIn,
            PlannedCheckOut = checkIn.AddDays(2),
            CageId = cageId
        };
    }

    private static Cage CatCage(SizeGroup sizeGroup) => new()
    {
        CageId = Guid.NewGuid(),
        Code = "A1",
        Species = Species.Cat,
        SizeGroup = sizeGroup,
        IsActive = true
    };

    [Fact]
    public async Task RecordForSpaAsync_WhenNeedsConfirmation_CreatesPendingConfirmationWithExpiry()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var spaSnapshot = new SpaAmountSnapshot(
            Species.Cat,
            SizeGroup.Small,
            AppointmentStatus.Received,
            [ServiceId],
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Small, Price = 100000m }]);
        var confirmations = new FakeCostConfirmationRepository { TimeoutMinutes = 30 };
        var (sut, _, _, bookings, _, _) = CreateSut(pet: pet, spaSnapshot: spaSnapshot, costConfirmations: confirmations);
        bookings.PricingByGroup[SizeGroup.Medium] =
            [new ServicePricing { ServiceId = ServiceId, Species = Species.Cat, SizeGroup = SizeGroup.Medium, Price = 150000m }];

        var outcome = await sut.RecordForSpaAsync(appt, 3.4m);

        var created = Assert.Single(confirmations.Added);
        Assert.Equal(AppointmentId, created.AppointmentId);
        Assert.Equal(3.4m, created.ActualWeightKg);
        Assert.Equal(SizeGroup.Medium, created.NewSizeGroup);
        Assert.Equal(100000m, created.OldAmount);
        Assert.Equal(150000m, created.NewAmount);
        Assert.Equal(ConfirmationStatus.Pending, created.Status);
        Assert.Equal(created.CreatedAt.AddMinutes(30), created.ExpiresAt);
        Assert.Equal(created.ExpiresAt, outcome.ExpiresAt);
        Assert.Null(outcome.CageSuitable);
    }

    [Fact]
    public async Task RecordForSpaAsync_WhenOk_DoesNotCreateConfirmation()
    {
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var appt = new SpaAppointment { AppointmentId = AppointmentId, PetId = PetId, SizeGroup = SizeGroup.Small };
        var confirmations = new FakeCostConfirmationRepository();
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, costConfirmations: confirmations);

        var outcome = await sut.RecordForSpaAsync(appt, 2.9m);

        Assert.Empty(confirmations.Added);
        Assert.Null(outcome.ExpiresAt);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenNeedsConfirmation_CreatesPendingConfirmationAndSkipsCageCheck()
    {
        var stay = ConfirmedStay(SizeGroup.Small);
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var confirmations = new FakeCostConfirmationRepository();
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay, costConfirmations: confirmations);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 3.4m);

        var created = Assert.Single(confirmations.Added);
        Assert.Equal(ConfirmationStatus.Pending, created.Status);
        Assert.Equal(SizeGroup.Medium, created.NewSizeGroup);
        Assert.Equal(240000m, created.OldAmount);
        Assert.Equal(360000m, created.NewAmount);
        Assert.Equal(created.ExpiresAt, outcome.ExpiresAt);
        Assert.Null(outcome.CageSuitable);
        Assert.Equal(SizeGroup.Small, stay.SizeGroup);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenPendingConfirmationExists_ThrowsCostConfirmationPendingAndChangesNothing()
    {
        var stay = ConfirmedStay(SizeGroup.Small);
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var confirmations = new FakeCostConfirmationRepository();
        confirmations.Added.Add(new CostConfirmation
        {
            ConfirmationId = Guid.NewGuid(),
            AppointmentId = AppointmentId,
            Status = ConfirmationStatus.Pending,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10)
        });
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay, costConfirmations: confirmations);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckHotelAsync(AppointmentId, 3.4m));

        Assert.Equal(ErrorCodes.CostConfirmationPending, ex.Code);
        Assert.Single(confirmations.Added);
        Assert.Null(stay.ActualWeightKg);
        Assert.Equal(2.8m, pet.WeightKg);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenPriceDecreasedAndAssignedCageHasOldGroup_ReturnsCageSuitableFalse()
    {
        var cage = CatCage(SizeGroup.Medium);
        var stay = ConfirmedStay(SizeGroup.Medium, cage.CageId);
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 4.0m, SizeGroup = SizeGroup.Medium };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay, cage: cage);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 2.9m);

        Assert.Equal(WeightCheckResult.PRICE_DECREASED, outcome.Result);
        Assert.False(outcome.CageSuitable);
        Assert.Null(outcome.ExpiresAt);
        Assert.Equal(SizeGroup.Small, stay.SizeGroup);
        Assert.Equal(cage.CageId, stay.CageId);
        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenPriceDecreasedAndAssignedCageMatchesNewGroup_ReturnsCageSuitableTrue()
    {
        var cage = CatCage(SizeGroup.Small);
        var stay = ConfirmedStay(SizeGroup.Medium, cage.CageId);
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 4.0m, SizeGroup = SizeGroup.Medium };
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay, cage: cage);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 2.9m);

        Assert.True(outcome.CageSuitable);
    }

    [Fact]
    public async Task CheckHotelAsync_WhenOk_DoesNotCheckCageNorCreateConfirmation()
    {
        var stay = ConfirmedStay(SizeGroup.Small);
        var pet = new Pet { PetId = PetId, Species = Species.Cat, WeightKg = 2.8m, SizeGroup = SizeGroup.Small };
        var confirmations = new FakeCostConfirmationRepository();
        var (sut, _, _, _, _, _) = CreateSut(pet: pet, appointment: stay, costConfirmations: confirmations);

        var outcome = await sut.CheckHotelAsync(AppointmentId, 3.2m);

        Assert.Equal(WeightCheckResult.OK, outcome.Result);
        Assert.Null(outcome.CageSuitable);
        Assert.Null(outcome.ExpiresAt);
        Assert.Empty(confirmations.Added);
    }

    #endregion
}
