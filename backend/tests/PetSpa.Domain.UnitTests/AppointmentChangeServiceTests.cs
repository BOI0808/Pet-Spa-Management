using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentChangeServiceTests
{
    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", TimeSpan.FromHours(7), "StoreTime", "StoreTime");
    private static readonly ShopTimeZone Shop = new(StoreTimeZone);

    private static readonly Guid CustomerUserId = Guid.NewGuid();
    private static readonly Guid CustomerId = Guid.NewGuid();
    private static readonly Guid PetId = Guid.NewGuid();
    private static readonly Guid ServiceId = Guid.NewGuid();
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid StaffA = Guid.NewGuid();
    private static readonly Guid StaffB = Guid.NewGuid();

    private static readonly CurrentUser CustomerUser = new(CustomerUserId, UserRole.Customer);
    private static readonly CurrentUser ManagerUser = new(Guid.NewGuid(), UserRole.Manager);
    private static readonly CurrentUser StaffUser = new(Guid.NewGuid(), UserRole.Staff);

    // Thời điểm UTC: daysFromNow ngày sau hôm nay, lúc hour giờ UTC.
    private static DateTimeOffset Utc(int daysFromNow, int hour) =>
        new(DateTime.UtcNow.Date.AddDays(daysFromNow).AddHours(hour), TimeSpan.Zero);

    // Mốc giờ spa theo giờ cửa hàng (UTC+7), daysFromNow ngày sau hôm nay.
    private static DateTimeOffset Slot(int daysFromNow, int hour) =>
        Shop.ToUtc(DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(daysFromNow)), new TimeOnly(hour, 0));

    private static SpaAppointment SpaAt(DateTimeOffset start, AppointmentStatus status = AppointmentStatus.Confirmed) => new()
    {
        AppointmentId = AppointmentId,
        CustomerId = CustomerId,
        PetId = PetId,
        SizeGroup = SizeGroup.Small,
        Status = status,
        SlotStart = start,
        SlotEnd = start.AddMinutes(60),
        BusyUntil = start.AddMinutes(75),
        StaffRequired = 1,
    };

    private static HotelAppointment StayAt(
        DateTimeOffset checkIn, DateTimeOffset checkOut, AppointmentStatus status = AppointmentStatus.Confirmed) => new()
    {
        AppointmentId = AppointmentId,
        CustomerId = CustomerId,
        PetId = PetId,
        SizeGroup = SizeGroup.Small,
        Status = status,
        PlannedCheckIn = checkIn,
        PlannedCheckOut = checkOut,
        CageId = Guid.NewGuid(),
    };

    private static AppointmentChangeInput SpaInput(DateTimeOffset slot) =>
        new(PetId, new List<Guid> { ServiceId }, slot, null, null);

    private static AppointmentChangeInput HotelInput(DateTimeOffset checkIn, DateTimeOffset checkOut) =>
        new(PetId, null, null, checkIn, checkOut);

    private static AppointmentChangeInput ManagerSpaInput(
        DateTimeOffset slot, IReadOnlyList<Guid>? staffIds = null, bool confirmOutOfShift = false) =>
        new(PetId, new List<Guid> { ServiceId }, slot, null, null, staffIds, null, confirmOutOfShift);

    private static AppointmentChangeInput ManagerHotelInput(
        DateTimeOffset checkIn, DateTimeOffset checkOut, Guid? cageId = null) =>
        new(PetId, null, null, checkIn, checkOut, null, cageId);

    private static List<StaffShift> ShiftsOf(params Guid[] staffIds) =>
        staffIds.Select(id => new StaffShift(id, DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(60))).ToList();

    private static Cage CageOf(Guid cageId, SizeGroup sizeGroup = SizeGroup.Small) =>
        new() { CageId = cageId, Species = Species.Dog, SizeGroup = sizeGroup, IsActive = true };

    #region Fakes

    private sealed class FakeChangeRepository : IAppointmentChangeRepository
    {
        public Appointment? Stored { get; set; }
        public Guid? OwnerUserId { get; set; } = CustomerUserId;
        public int DeadlineMinutes { get; set; } = 60;
        public bool ServicesReplaced { get; private set; }
        public bool StaffRemoved { get; private set; }
        public bool StaffReleased { get; private set; }
        public List<Guid> HoldingStaffIds { get; set; } = [];

        public Task<AppointmentWithOwner?> FindWithOwnerAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<AppointmentWithOwner?>(Stored is null ? null : new AppointmentWithOwner(Stored, OwnerUserId));

        public Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default) =>
            Task.FromResult(DeadlineMinutes);

        public Task ReplaceServicesAsync(Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default)
        {
            ServicesReplaced = true;
            return Task.CompletedTask;
        }

        public Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default)
        {
            StaffRemoved = true;
            return Task.CompletedTask;
        }

        public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default)
        {
            StaffReleased = true;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Guid>>(HoldingStaffIds.ToList());
    }

    private sealed class FakePetRepository : IPetRepository
    {
        public PetWithOwner? PetResult { get; set; }

        public Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(PetResult);

        public Task<Guid?> FindCustomerIdByUserIdAsync(Guid userId, CancellationToken ct = default) => Task.FromResult<Guid?>(null);
        public Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken ct = default) => Task.FromResult(true);
        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(Species species, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<SizeRule>>([]);
        public Task<IReadOnlyList<WeightTolerance>> GetWeightTolerancesAsync(Species species, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<WeightTolerance>>([]);
        public Task<(IReadOnlyList<Pet> Items, int Total)> ListActiveByCustomerAsync(Guid customerId, int page, int pageSize, CancellationToken ct = default) => Task.FromResult<(IReadOnlyList<Pet>, int)>(([], 0));
        public Task<bool> IsAssignedToStaffAsync(Guid petId, Guid staffUserId, CancellationToken ct = default) => Task.FromResult(false);
        public Task<bool> HasAppointmentsAsync(Guid petId, CancellationToken ct = default) => Task.FromResult(false);
        public void Add(Pet pet) { }
        public void Remove(Pet pet) { }
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeBookingRepository : IBookingRepository
    {
        public List<BookableService> Services { get; set; } = [new BookableService(ServiceId, new TimeOnly(19, 0), 60, 1)];
        public int BufferMinutes { get; set; } = 15;
        public List<StaffShift> Shifts { get; set; } =
            [new StaffShift(Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(60))];
        public List<HeldBooking> Held { get; set; } = [];

        public Task<IReadOnlyList<BookableService>> FindBookableServicesAsync(
            IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<BookableService>>(Services.Where(s => serviceIds.Contains(s.ServiceId)).ToList());

        public Task<int> GetBufferMinutesAsync(CancellationToken ct = default) => Task.FromResult(BufferMinutes);

        public Task<IReadOnlyList<StaffShift>> ListSpaStaffShiftsAsync(
            DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<StaffShift>>(Shifts);

        public Task<IReadOnlyList<HeldBooking>> ListHeldBookingsAsync(
            DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<HeldBooking>>(Held.ToList());

        public Task<IReadOnlyList<ServicePricing>> ListPricingAsync(
            IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public void AddSpaAppointment(SpaAppointment appointment, IReadOnlyList<Guid> serviceIds) =>
            throw new NotImplementedException();

        public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<PagedResult<AppointmentListItem>> ListAppointmentsAsync(
            AppointmentType? type, AppointmentStatus? status, DateOnly? date, AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeServiceCatalogRepository : IServiceCatalogRepository
    {
        public Task<IReadOnlyList<TimeOnly>> GetSlotTimesAsync(CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<TimeOnly>>(Enumerable.Range(9, 11).Select(h => new TimeOnly(h, 0)).ToList());

        public Task<IReadOnlyList<ServiceWithPricing>> ListAsync(
            bool includeInactive, Species? species, SizeGroup? sizeGroup, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task AddAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<SizeRule>> GetSizeRulesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<bool> UpdateAsync(Service service, IReadOnlyList<ServicePricing> pricing, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<bool> SetActiveAsync(Guid serviceId, bool isActive, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeHotelBookingRepository : IHotelBookingRepository
    {
        public int ActiveCages { get; set; } = 1;
        public List<HotelAppointment> HoldingStays { get; set; } = [];

        public Task<bool> IsCustomerBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> CountActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.FromResult(ActiveCages);

        public Task<IReadOnlyList<HotelAppointment>> ListHoldingStaysAsync(
            Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<HotelAppointment>>(HoldingStays.ToList());

        public void Add(HotelAppointment appointment) => throw new NotImplementedException();
    }

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public Dictionary<Guid, string> ActiveStaff { get; set; } = [];
        public List<StaffAssignment> Holding { get; set; } = [];
        public List<AppointmentStaff> Added { get; } = [];

        public Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetHoldMinutesAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<AppointmentType?> FindAppointmentTypeAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(
            DateTimeOffset since, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
            DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<StaffAssignment>>(Holding);

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyDictionary<Guid, string>>(
                ActiveStaff.Where(kv => staffIds.Contains(kv.Key)).ToDictionary(kv => kv.Key, kv => kv.Value));

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) => Added.AddRange(assignments);
    }

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public List<Cage> Cages { get; set; } = [];
        public List<HotelAppointment> AssignedStays { get; set; } = [];

        public Task<Appointment?> FindAppointmentAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) =>
            Task.FromResult(Cages.FirstOrDefault(c => c.CageId == cageId));

        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(
            Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(
            Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<HotelAppointment>>(AssignedStays.ToList());
    }

    private sealed class FakeTimeZoneProvider(TimeZoneInfo tz) : IStoreTimeZoneProvider
    {
        public TimeZoneInfo GetStoreTimeZone() => tz;
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion

    private sealed class Fixture
    {
        public FakeChangeRepository Changes { get; } = new();
        public FakePetRepository Pets { get; } = new();
        public FakeBookingRepository Bookings { get; } = new();
        public FakeHotelBookingRepository Hotel { get; } = new();
        public FakeAssignmentRepository Assignments { get; } = new();
        public FakeHotelAssignmentRepository HotelAssignments { get; } = new();
        public AppointmentChangeService Service { get; }

        public Fixture()
        {
            Pets.PetResult = new PetWithOwner(
                new Pet { PetId = PetId, CustomerId = CustomerId, Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true },
                CustomerUserId);

            Service = new AppointmentChangeService(
                Changes, Pets, Bookings, new FakeServiceCatalogRepository(), Hotel,
                new FakeTimeZoneProvider(StoreTimeZone), Shop, new FakeConcurrencyGuard(), Assignments, HotelAssignments);
        }
    }

    private static async Task AssertErrorAsync(string code, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    // --- Hủy lịch (FR-CHG-01, FR-CHG-02) ---

    [Fact]
    public async Task Cancel_SpaWithinWindow_CancelsWithCustomerCancelledAndReleasesStaff()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;

        var status = await f.Service.CancelAsync(CustomerUser, AppointmentId);

        Assert.Equal(AppointmentStatus.Cancelled, status);
        Assert.Equal(CancelReason.CustomerCancelled, spa.CancelReason);
        Assert.True(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_HotelWithinWindow_CancelsWithoutTouchingStaff()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        f.Changes.Stored = stay;

        var status = await f.Service.CancelAsync(CustomerUser, AppointmentId);

        Assert.Equal(AppointmentStatus.Cancelled, status);
        Assert.Equal(CancelReason.CustomerCancelled, stay.CancelReason);
        Assert.False(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_PastWindow_ThrowsChangeWindowClosedAndKeepsStatus()
    {
        var f = new Fixture();
        var spa = SpaAt(DateTimeOffset.UtcNow.AddMinutes(30));
        f.Changes.Stored = spa;

        await AssertErrorAsync(ErrorCodes.ChangeWindowClosed, () => f.Service.CancelAsync(CustomerUser, AppointmentId));

        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
        Assert.False(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_JustInsideWindow_Succeeds()
    {
        var f = new Fixture();
        f.Changes.DeadlineMinutes = 60;
        // Cách giờ hẹn hơn hạn 60 phút một chút (tránh lệch giờ chạy test): vẫn trong hạn.
        f.Changes.Stored = SpaAt(DateTimeOffset.UtcNow.AddMinutes(61));

        var status = await f.Service.CancelAsync(CustomerUser, AppointmentId);

        Assert.Equal(AppointmentStatus.Cancelled, status);
    }

    [Fact]
    public async Task Cancel_OtherCustomersAppointment_ThrowsForbidden()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Changes.OwnerUserId = Guid.NewGuid();

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.CancelAsync(CustomerUser, AppointmentId));
    }

    [Fact]
    public async Task Cancel_NotFound_ThrowsNotFound()
    {
        var f = new Fixture();

        await AssertErrorAsync(ErrorCodes.NotFound, () => f.Service.CancelAsync(CustomerUser, AppointmentId));
    }

    [Fact]
    public async Task Cancel_WhenAlreadyCancelled_ThrowsInvalidTransition()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10), AppointmentStatus.Cancelled);

        await AssertErrorAsync(ErrorCodes.InvalidTransition, () => f.Service.CancelAsync(CustomerUser, AppointmentId));
    }

    [Fact]
    public async Task Cancel_ByStaff_ThrowsForbidden()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.CancelAsync(StaffUser, AppointmentId));
    }

    [Fact]
    public async Task Cancel_ByCustomerSendingReason_StillUsesCustomerCancelled()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;

        await f.Service.CancelAsync(CustomerUser, AppointmentId, CancelReason.StoreUnable);

        Assert.Equal(CancelReason.CustomerCancelled, spa.CancelReason);
    }

    [Theory]
    [InlineData(CancelReason.StoreUnable)]
    [InlineData(CancelReason.CustomerBeyondDeadline)]
    public async Task Cancel_ByManagerPastCustomerDeadline_CancelsWithGivenReasonAndReleasesStaff(CancelReason reason)
    {
        var f = new Fixture();
        var spa = SpaAt(DateTimeOffset.UtcNow.AddMinutes(30));
        f.Changes.Stored = spa;

        var status = await f.Service.CancelAsync(ManagerUser, AppointmentId, reason);

        Assert.Equal(AppointmentStatus.Cancelled, status);
        Assert.Equal(reason, spa.CancelReason);
        Assert.NotNull(spa.CancelledAt);
        Assert.True(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_ByManagerSpaInProgress_Cancels()
    {
        var f = new Fixture();
        var spa = SpaAt(DateTimeOffset.UtcNow.AddHours(-1), AppointmentStatus.InProgress);
        f.Changes.Stored = spa;

        var status = await f.Service.CancelAsync(ManagerUser, AppointmentId, CancelReason.StoreUnable);

        Assert.Equal(AppointmentStatus.Cancelled, status);
        Assert.True(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_ByManagerHotelInStay_CancelsWithoutTouchingStaff()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(-1, 7), Utc(1, 5), AppointmentStatus.InStay);
        f.Changes.Stored = stay;

        var status = await f.Service.CancelAsync(ManagerUser, AppointmentId, CancelReason.CustomerBeyondDeadline);

        Assert.Equal(AppointmentStatus.Cancelled, status);
        Assert.Equal(CancelReason.CustomerBeyondDeadline, stay.CancelReason);
        Assert.False(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_ByManagerWithoutReason_ThrowsValidationErrorAndKeepsStatus()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;

        await AssertErrorAsync(ErrorCodes.ValidationError, () => f.Service.CancelAsync(ManagerUser, AppointmentId));

        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
        Assert.False(f.Changes.StaffReleased);
    }

    [Theory]
    [InlineData(CancelReason.CustomerCancelled)]
    [InlineData(CancelReason.NoShow)]
    [InlineData(CancelReason.CostNotConfirmed)]
    public async Task Cancel_ByManagerWithReasonOutsideManagerList_ThrowsValidationError(CancelReason reason)
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;

        await AssertErrorAsync(ErrorCodes.ValidationError, () => f.Service.CancelAsync(ManagerUser, AppointmentId, reason));

        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public async Task Cancel_ByManagerFinishedAppointment_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10), status);

        await AssertErrorAsync(
            ErrorCodes.InvalidTransition,
            () => f.Service.CancelAsync(ManagerUser, AppointmentId, CancelReason.StoreUnable));

        Assert.False(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Cancel_ByManagerNotFound_ThrowsNotFound()
    {
        var f = new Fixture();

        await AssertErrorAsync(
            ErrorCodes.NotFound,
            () => f.Service.CancelAsync(ManagerUser, AppointmentId, CancelReason.StoreUnable));
    }

    // --- Đổi lịch spa (FR-CHG-01, BR-13, BR-26) ---

    [Fact]
    public async Task ChangeSpa_Confirmed_ReturnsToPendingAndRecalculatesWindow()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;
        var newSlot = Slot(6, 14);

        var status = await f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(newSlot));

        Assert.Equal(AppointmentStatus.Pending, status);
        Assert.Equal(newSlot, spa.SlotStart);
        Assert.Equal(newSlot.AddMinutes(60), spa.SlotEnd);
        Assert.Equal(newSlot.AddMinutes(75), spa.BusyUntil);
        Assert.Equal((short)1, spa.StaffRequired);
        Assert.True(f.Changes.StaffRemoved);
        Assert.True(f.Changes.ServicesReplaced);
    }

    [Fact]
    public async Task ChangeSpa_SameSlot_DoesNotCountOwnHold()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;
        // Chỉ có 1 nhân viên và lịch hiện tại đang giữ chỗ đó: nếu không loại lượt giữ chỗ cũ sẽ báo kín oan.
        f.Bookings.Held = [new HeldBooking(spa.SlotStart, spa.BusyUntil, 1)];

        var status = await f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(Slot(5, 10)));

        Assert.Equal(AppointmentStatus.Pending, status);
    }

    [Fact]
    public async Task ChangeSpa_SlotFull_ThrowsSlotFullAndWritesNothing()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;
        f.Bookings.Shifts = [];

        await AssertErrorAsync(ErrorCodes.SlotFull, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(Slot(6, 14))));

        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
        Assert.False(f.Changes.StaffRemoved);
        Assert.False(f.Changes.ServicesReplaced);
    }

    [Fact]
    public async Task ChangeSpa_PastWindow_ThrowsChangeWindowClosed()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(DateTimeOffset.UtcNow.AddMinutes(30));

        await AssertErrorAsync(ErrorCodes.ChangeWindowClosed, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task ChangeSpa_MissingFields_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));

        await AssertErrorAsync(
            ErrorCodes.ValidationError,
            () => f.Service.ChangeAsync(CustomerUser, AppointmentId, new AppointmentChangeInput(PetId, null, null, null, null)));
    }

    [Fact]
    public async Task ChangeSpa_ServiceNotApplicable_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Bookings.Services = [];

        await AssertErrorAsync(ErrorCodes.ValidationError, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task ChangeSpa_SlotNotOnSlotTimes_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));

        await AssertErrorAsync(
            ErrorCodes.ValidationError,
            () => f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(Slot(6, 14).AddMinutes(30))));
    }

    [Fact]
    public async Task ChangeSpa_PetOfOtherCustomer_ThrowsForbidden()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Pets.PetResult = new PetWithOwner(
            new Pet { PetId = PetId, CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true },
            Guid.NewGuid());

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, SpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task ChangeSpa_ByManagerPending_KeepsPendingAndDoesNotTouchStaff()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10), AppointmentStatus.Pending);
        f.Changes.Stored = spa;
        var newSlot = Slot(6, 14);

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(newSlot, [StaffA]));

        Assert.Equal(AppointmentStatus.Pending, status);
        Assert.Equal(newSlot, spa.SlotStart);
        Assert.Equal(newSlot.AddMinutes(75), spa.BusyUntil);
        Assert.True(f.Changes.ServicesReplaced);
        Assert.False(f.Changes.StaffRemoved);
        Assert.Empty(f.Assignments.Added);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerConfirmed_KeepsStatusAndCurrentStaffOnNewWindow()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;
        f.Changes.HoldingStaffIds = [StaffA];
        f.Assignments.ActiveStaff = new() { [StaffA] = "An" };
        f.Bookings.Shifts = ShiftsOf(StaffA);
        var newSlot = Slot(6, 14);

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(newSlot));

        Assert.Equal(AppointmentStatus.Confirmed, status);
        Assert.Equal(newSlot, spa.SlotStart);
        Assert.True(f.Changes.StaffRemoved);
        var row = Assert.Single(f.Assignments.Added);
        Assert.Equal(StaffA, row.StaffId);
        Assert.Equal(newSlot, row.BusyFrom);
        Assert.Equal(newSlot.AddMinutes(75), row.BusyUntil);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerConfirmed_ReplacesStaffWhenStaffIdsGiven()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Changes.HoldingStaffIds = [StaffA];
        f.Assignments.ActiveStaff = new() { [StaffA] = "An", [StaffB] = "Bình" };
        f.Bookings.Shifts = ShiftsOf(StaffA, StaffB);

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14), [StaffB]));

        Assert.Equal(AppointmentStatus.Confirmed, status);
        var row = Assert.Single(f.Assignments.Added);
        Assert.Equal(StaffB, row.StaffId);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerPastCustomerDeadline_IsAllowed()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(DateTimeOffset.UtcNow.AddMinutes(30), AppointmentStatus.Pending);

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14)));

        Assert.Equal(AppointmentStatus.Pending, status);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerStaffBusy_ThrowsStaffConflict()
    {
        var f = new Fixture();
        var newSlot = Slot(6, 14);
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Changes.HoldingStaffIds = [StaffA];
        f.Assignments.ActiveStaff = new() { [StaffA] = "An" };
        f.Assignments.Holding = [new StaffAssignment(StaffA, newSlot, newSlot.AddMinutes(75))];
        f.Bookings.Shifts = ShiftsOf(StaffA);

        await AssertErrorAsync(ErrorCodes.StaffConflict, () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(newSlot)));

        Assert.Empty(f.Assignments.Added);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerStaffOutOfShift_ThrowsUnlessConfirmed()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Changes.HoldingStaffIds = [StaffA];
        f.Assignments.ActiveStaff = new() { [StaffA] = "An" };

        await AssertErrorAsync(
            ErrorCodes.StaffOutOfShift,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));
        Assert.Empty(f.Assignments.Added);

        var status = await f.Service.ChangeAsync(
            ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14), confirmOutOfShift: true));

        Assert.Equal(AppointmentStatus.Confirmed, status);
        Assert.Equal(StaffA, Assert.Single(f.Assignments.Added).StaffId);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerNeedsMoreStaffThanHeld_ThrowsStaffCountMismatch()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Changes.HoldingStaffIds = [StaffA];
        f.Assignments.ActiveStaff = new() { [StaffA] = "An", [StaffB] = "Bình" };
        f.Bookings.Services = [new BookableService(ServiceId, new TimeOnly(19, 0), 60, 2)];
        f.Bookings.Shifts = ShiftsOf(StaffA, StaffB);

        await AssertErrorAsync(
            ErrorCodes.StaffCountMismatch,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task ChangeSpa_ByManagerInactiveStaff_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Bookings.Shifts = ShiftsOf(StaffB);

        await AssertErrorAsync(
            ErrorCodes.ValidationError,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14), [StaffB])));
    }

    [Fact]
    public async Task ChangeSpa_ByManagerSlotFull_ThrowsSlotFullAndWritesNothing()
    {
        var f = new Fixture();
        var spa = SpaAt(Slot(5, 10));
        f.Changes.Stored = spa;
        f.Bookings.Shifts = [];

        await AssertErrorAsync(ErrorCodes.SlotFull, () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));

        Assert.Equal(Slot(5, 10), spa.SlotStart);
        Assert.False(f.Changes.StaffRemoved);
        Assert.False(f.Changes.ServicesReplaced);
    }

    [Fact]
    public async Task ChangeSpa_ByManagerPetOfOtherCustomer_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));
        f.Pets.PetResult = new PetWithOwner(
            new Pet { PetId = PetId, CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true },
            Guid.NewGuid());

        await AssertErrorAsync(ErrorCodes.ValidationError, () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task ChangeSpa_ByManagerReceived_ThrowsInvalidTransition()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10), AppointmentStatus.Received);

        await AssertErrorAsync(ErrorCodes.InvalidTransition, () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task Change_ByStaff_ThrowsForbidden()
    {
        var f = new Fixture();
        f.Changes.Stored = SpaAt(Slot(5, 10));

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.ChangeAsync(StaffUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));
    }

    [Fact]
    public async Task Change_ByManagerNotFound_ThrowsNotFound()
    {
        var f = new Fixture();

        await AssertErrorAsync(ErrorCodes.NotFound, () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerSpaInput(Slot(6, 14))));
    }

    // --- Đổi lịch lưu trú (FR-CHG-01, BR-21, BR-26) ---

    [Fact]
    public async Task ChangeHotel_Confirmed_ReturnsToPendingAndClearsCage()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        f.Changes.Stored = stay;
        var newIn = Utc(11, 7);
        var newOut = Utc(13, 5);

        var status = await f.Service.ChangeAsync(CustomerUser, AppointmentId, HotelInput(newIn, newOut));

        Assert.Equal(AppointmentStatus.Pending, status);
        Assert.Null(stay.CageId);
        Assert.Equal(newIn, stay.PlannedCheckIn);
        Assert.Equal(newOut, stay.PlannedCheckOut);
    }

    [Fact]
    public async Task ChangeHotel_OwnStayDoesNotTakeLastCage()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        f.Changes.Stored = stay;
        f.Hotel.ActiveCages = 1;
        f.Hotel.HoldingStays = [stay];

        var status = await f.Service.ChangeAsync(CustomerUser, AppointmentId, HotelInput(Utc(10, 7), Utc(12, 5)));

        Assert.Equal(AppointmentStatus.Pending, status);
    }

    [Fact]
    public async Task ChangeHotel_NoCageLeft_ThrowsNoCapacityAndKeepsData()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        var cageId = stay.CageId;
        f.Changes.Stored = stay;
        f.Hotel.ActiveCages = 1;
        f.Hotel.HoldingStays =
        [
            new HotelAppointment { AppointmentId = Guid.NewGuid(), PlannedCheckIn = Utc(11, 7), PlannedCheckOut = Utc(13, 5) },
        ];

        await AssertErrorAsync(ErrorCodes.NoCapacity, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, HotelInput(Utc(11, 7), Utc(13, 5))));

        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
        Assert.Equal(cageId, stay.CageId);
    }

    [Fact]
    public async Task ChangeHotel_CheckOutNotAfterCheckIn_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));

        await AssertErrorAsync(ErrorCodes.ValidationError, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, HotelInput(Utc(11, 7), Utc(11, 9))));
    }

    [Fact]
    public async Task ChangeHotel_CheckInInPast_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));

        await AssertErrorAsync(ErrorCodes.ValidationError, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, HotelInput(Utc(-1, 7), Utc(2, 5))));
    }

    [Fact]
    public async Task ChangeHotel_MissingFields_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));

        await AssertErrorAsync(
            ErrorCodes.ValidationError,
            () => f.Service.ChangeAsync(CustomerUser, AppointmentId, new AppointmentChangeInput(PetId, null, null, Utc(11, 7), null)));
    }

    [Fact]
    public async Task ChangeHotel_PastWindow_ThrowsChangeWindowClosed()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(DateTimeOffset.UtcNow.AddMinutes(30), Utc(3, 5));

        await AssertErrorAsync(ErrorCodes.ChangeWindowClosed, () => f.Service.ChangeAsync(CustomerUser, AppointmentId, HotelInput(Utc(11, 7), Utc(13, 5))));
    }

    [Fact]
    public async Task ChangeHotel_ByManagerPending_KeepsPendingWithoutCage()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5), AppointmentStatus.Pending);
        stay.CageId = null;
        f.Changes.Stored = stay;

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5), Guid.NewGuid()));

        Assert.Equal(AppointmentStatus.Pending, status);
        Assert.Null(stay.CageId);
        Assert.Equal(Utc(11, 7), stay.PlannedCheckIn);
        Assert.Equal(Utc(13, 5), stay.PlannedCheckOut);
    }

    [Fact]
    public async Task ChangeHotel_ByManagerConfirmed_KeepsStatusAndCurrentCage()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        var cageId = stay.CageId!.Value;
        f.Changes.Stored = stay;
        f.HotelAssignments.Cages = [CageOf(cageId)];
        f.HotelAssignments.AssignedStays = [stay];

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5)));

        Assert.Equal(AppointmentStatus.Confirmed, status);
        Assert.Equal(cageId, stay.CageId);
        Assert.Equal(Utc(11, 7), stay.PlannedCheckIn);
        Assert.Equal(Utc(13, 5), stay.PlannedCheckOut);
    }

    [Fact]
    public async Task ChangeHotel_ByManagerConfirmed_ReplacesCageWhenCageIdGiven()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        var newCageId = Guid.NewGuid();
        f.Changes.Stored = stay;
        f.HotelAssignments.Cages = [CageOf(newCageId)];

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5), newCageId));

        Assert.Equal(AppointmentStatus.Confirmed, status);
        Assert.Equal(newCageId, stay.CageId);
    }

    [Fact]
    public async Task ChangeHotel_ByManagerCageTakenByOtherStay_ThrowsCageConflict()
    {
        var f = new Fixture();
        var stay = StayAt(Utc(10, 7), Utc(12, 5));
        var cageId = stay.CageId!.Value;
        f.Changes.Stored = stay;
        f.HotelAssignments.Cages = [CageOf(cageId)];
        f.HotelAssignments.AssignedStays =
        [
            new HotelAppointment { AppointmentId = Guid.NewGuid(), CageId = cageId, PlannedCheckIn = Utc(11, 7), PlannedCheckOut = Utc(13, 5) },
        ];

        await AssertErrorAsync(
            ErrorCodes.CageConflict,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5))));
    }

    [Fact]
    public async Task ChangeHotel_ByManagerCageOfOtherSizeGroup_ThrowsCageConflict()
    {
        var f = new Fixture();
        var newCageId = Guid.NewGuid();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));
        f.HotelAssignments.Cages = [CageOf(newCageId, SizeGroup.Large)];

        await AssertErrorAsync(
            ErrorCodes.CageConflict,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5), newCageId)));
    }

    [Fact]
    public async Task ChangeHotel_ByManagerCageNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));

        await AssertErrorAsync(
            ErrorCodes.NotFound,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5), Guid.NewGuid())));
    }

    [Fact]
    public async Task ChangeHotel_ByManagerNoCageLeft_ThrowsNoCapacity()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));
        f.Hotel.ActiveCages = 1;
        f.Hotel.HoldingStays =
        [
            new HotelAppointment { AppointmentId = Guid.NewGuid(), PlannedCheckIn = Utc(11, 7), PlannedCheckOut = Utc(13, 5) },
        ];

        await AssertErrorAsync(
            ErrorCodes.NoCapacity,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5))));
    }

    [Fact]
    public async Task ChangeHotel_ByManagerPastCustomerDeadline_IsAllowed()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(DateTimeOffset.UtcNow.AddMinutes(30), Utc(3, 5), AppointmentStatus.Pending);

        var status = await f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5)));

        Assert.Equal(AppointmentStatus.Pending, status);
    }

    [Fact]
    public async Task ChangeHotel_ByManagerInStay_ThrowsInvalidTransition()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(-1, 7), Utc(2, 5), AppointmentStatus.InStay);

        await AssertErrorAsync(
            ErrorCodes.InvalidTransition,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5))));
    }

    [Fact]
    public async Task ChangeHotel_ByManagerPetOfOtherCustomer_ThrowsValidationError()
    {
        var f = new Fixture();
        f.Changes.Stored = StayAt(Utc(10, 7), Utc(12, 5));
        f.Pets.PetResult = new PetWithOwner(
            new Pet { PetId = PetId, CustomerId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true },
            Guid.NewGuid());

        await AssertErrorAsync(
            ErrorCodes.ValidationError,
            () => f.Service.ChangeAsync(ManagerUser, AppointmentId, ManagerHotelInput(Utc(11, 7), Utc(13, 5))));
    }
}
