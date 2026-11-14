using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CheckInServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private const decimal ActualWeightKg = 4m;

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public SpaAppointment? Appointment { get; set; }
        public AppointmentType? AppointmentType { get; set; } = Domain.Enums.AppointmentType.Spa;
        public int HoldMinutes { get; set; } = 15;

        public Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Appointment is not null ? AppointmentType : null);

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<int> GetHoldMinutesAsync(CancellationToken ct = default) =>
            Task.FromResult(HoldMinutes);

        public Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(
            DateTimeOffset since, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
            DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) =>
            throw new NotImplementedException();
    }

    private sealed class FakePetRepository(Pet pet) : IPetRepository
    {
        public Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<PetWithOwner?>(new PetWithOwner(pet, null));

        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<SizeRule>>(
                [new SizeRule { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m }]);

        public Task<IReadOnlyList<WeightTolerance>> GetWeightTolerancesAsync(Species species, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<WeightTolerance>>([]);

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
        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult<SpaAmountSnapshot?>(null);

        public Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult<StayAmountSnapshot?>(null);

        public Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default) =>
            Task.FromResult(new LateFeeConfig(15, 60, 50000m));
    }

    private sealed class FakeBookingRepository : IBookingRepository
    {
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
            Task.FromResult<IReadOnlyList<ServicePricing>>([]);

        public void AddSpaAppointment(SpaAppointment appointment, IReadOnlyList<Guid> serviceIds) =>
            throw new NotImplementedException();

        public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<AppointmentListItem>> ListAppointmentsAsync(
            AppointmentType? type, AppointmentStatus? status, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public Task<Appointment?> FindAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<Appointment?>(null);

        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<HotelAppointmentWithSpecies?>(null);

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakeHotelCatalogRepository : IHotelCatalogRepository
    {
        public Task<HotelPricingSnapshot> GetPricingAsync(CancellationToken ct = default) =>
            Task.FromResult(new HotelPricingSnapshot([], 50000m));

        public Task AddCageAsync(Cage cage, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> UpdateCageAsync(Guid cageId, string? code, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> SetCageActiveAsync(Guid cageId, bool isActive, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public Task SavePricingAsync(IReadOnlyList<HotelPricing> pricing, decimal lateFeePerBlock, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakeStoreTimeZoneProvider : IStoreTimeZoneProvider
    {
        public TimeZoneInfo GetStoreTimeZone() => TimeZoneInfo.Utc;
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Guid? LockedAppointmentId { get; private set; }

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            LockedAppointmentId = appointmentId;
            return Task.CompletedTask;
        }
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    private static SpaAppointment Spa(AppointmentStatus status, DateTimeOffset slotStart) => new()
    {
        AppointmentId = AppointmentId,
        Status = status,
        StaffRequired = 1,
        SizeGroup = SizeGroup.Medium,
        SlotStart = slotStart,
        SlotEnd = slotStart.AddHours(1),
        BusyUntil = slotStart.AddMinutes(75),
    };

    private static (CheckInService Sut, FakeAssignmentRepository Repo, FakeConcurrencyGuard Guard) CreateSut(
        SpaAppointment? appointment, int holdMinutes = 15, AppointmentType? appointmentType = AppointmentType.Spa)
    {
        var repo = new FakeAssignmentRepository
        {
            Appointment = appointment,
            HoldMinutes = holdMinutes,
            AppointmentType = appointmentType
        };
        var guard = new FakeConcurrencyGuard();
        var shopTimeZone = new ShopTimeZone(TimeZoneInfo.Utc);
        var pet = new Pet { PetId = Guid.NewGuid(), Species = Species.Cat, WeightKg = 4m, SizeGroup = SizeGroup.Medium };
        var paymentRepo = new FakePaymentAmountRepository();
        var bookingRepo = new FakeBookingRepository();
        var hotelAssignRepo = new FakeHotelAssignmentRepository();
        var hotelCatalogRepo = new FakeHotelCatalogRepository();
        var timeZoneProvider = new FakeStoreTimeZoneProvider();
        var weightCheck = new WeightCheckService(
            new FakePetRepository(pet),
            paymentRepo,
            bookingRepo,
            hotelAssignRepo,
            hotelCatalogRepo,
            timeZoneProvider,
            guard);
        return (new CheckInService(repo, guard, shopTimeZone, weightCheck), repo, guard);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenConfirmedAndWithinHold_MovesToReceived()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-10));
        var (sut, _, guard) = CreateSut(appointment);

        var result = await sut.CheckInSpaAsync(AppointmentId, ActualWeightKg);

        Assert.Equal(AppointmentStatus.Received, result.Status);
        Assert.Equal(AppointmentStatus.Received, appointment.Status);
        Assert.Equal(WeightCheckResult.OK, result.WeightCheck.Result);
        Assert.Equal(ActualWeightKg, appointment.ActualWeightKg);
        Assert.Equal(AppointmentId, guard.LockedAppointmentId);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenBeforeSlotStartOnSameDay_MovesToReceived()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(30));
        var (sut, _, _) = CreateSut(appointment);

        var result = await sut.CheckInSpaAsync(AppointmentId, ActualWeightKg);

        Assert.Equal(AppointmentStatus.Received, result.Status);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenFutureDate_ThrowsInvalidTransition()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddDays(1));
        var (sut, _, _) = CreateSut(appointment);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId, ActualWeightKg));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenPastHoldMinutes_ThrowsInvalidTransitionAndKeepsStatus()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-30));
        var (sut, _, _) = CreateSut(appointment);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId, ActualWeightKg));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        Assert.Null(appointment.ActualWeightKg);
    }

    [Fact]
    public async Task CheckInSpaAsync_UsesConfiguredHoldMinutes()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-20));
        var (sut, _, _) = CreateSut(appointment, holdMinutes: 30);

        var result = await sut.CheckInSpaAsync(AppointmentId, ActualWeightKg);

        Assert.Equal(AppointmentStatus.Received, result.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task CheckInSpaAsync_WhenNotConfirmed_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var appointment = Spa(status, DateTimeOffset.UtcNow.AddMinutes(-5));
        var (sut, _, _) = CreateSut(appointment);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId, ActualWeightKg));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, appointment.Status);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var (sut, _, _) = CreateSut(null);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId, ActualWeightKg));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task CheckInSpaAsync_WhenHotelAppointment_ThrowsInvalidTransition()
    {
        var appointment = Spa(AppointmentStatus.Confirmed, DateTimeOffset.UtcNow.AddMinutes(-5));
        var (sut, _, _) = CreateSut(appointment, appointmentType: AppointmentType.Hotel);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => sut.CheckInSpaAsync(AppointmentId, ActualWeightKg));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }
}
