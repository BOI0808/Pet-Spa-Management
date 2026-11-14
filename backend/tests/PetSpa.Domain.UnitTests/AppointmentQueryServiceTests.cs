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

public class AppointmentQueryServiceTests
{
    private static readonly Guid CustomerUserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();
    private static readonly CurrentUser CustomerUser = new(CustomerUserId, UserRole.Customer);

    private sealed class FakeAppointmentQueryRepository : IAppointmentQueryRepository
    {
        public Guid? LastCustomerUserId { get; private set; }
        public Guid? LastSpaStaffUserId { get; private set; }
        public AppointmentType? LastType { get; private set; }
        public AppointmentStatus? LastStatus { get; private set; }
        public Guid? LastPetId { get; private set; }
        public DateOnly? LastDate { get; private set; }
        public AppointmentSort? LastSort { get; private set; }
        public int LastPage { get; private set; }
        public int LastPageSize { get; private set; }
        public PagedResult<AppointmentListItem> ListResult { get; set; } = new([], 1, 20, 0);
        public PagedResult<AppointmentListItem> SpaStaffListResult { get; set; } = new([], 1, 20, 0);

        public AppointmentDetailData? DetailResult { get; set; }
        public bool IsAssignedResult { get; set; }

        public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
            Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default)
        {
            LastCustomerUserId = customerUserId;
            LastType = type;
            LastStatus = status;
            LastPetId = petId;
            LastDate = date;
            LastSort = sort;
            LastPage = page;
            LastPageSize = pageSize;
            return Task.FromResult(ListResult);
        }

        public Task<PagedResult<AppointmentListItem>> ListBySpaStaffUserAsync(
            Guid staffUserId, AppointmentType? type, AppointmentStatus? status, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default)
        {
            LastSpaStaffUserId = staffUserId;
            LastType = type;
            LastStatus = status;
            LastDate = date;
            LastSort = sort;
            LastPage = page;
            LastPageSize = pageSize;
            return Task.FromResult(SpaStaffListResult);
        }

        public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(DetailResult);

        public Task<bool> IsAssignedToSpaStaffAsync(Guid appointmentId, Guid staffUserId, CancellationToken ct = default) =>
            Task.FromResult(IsAssignedResult);
    }

    private sealed class FakeBookingRepository : IBookingRepository
    {
        public int ListAppointmentsCalls { get; private set; }
        public AppointmentType? LastType { get; private set; }
        public AppointmentStatus? LastStatus { get; private set; }
        public DateOnly? LastDate { get; private set; }
        public AppointmentSort? LastSort { get; private set; }
        public int LastPage { get; private set; }
        public int LastPageSize { get; private set; }
        public PagedResult<AppointmentListItem> StoreWideResult { get; set; } = new([], 1, 20, 0);

        public Task<PagedResult<AppointmentListItem>> ListAppointmentsAsync(
            AppointmentType? type, AppointmentStatus? status, DateOnly? date, AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default)
        {
            ListAppointmentsCalls++;
            LastType = type;
            LastStatus = status;
            LastDate = date;
            LastSort = sort;
            LastPage = page;
            LastPageSize = pageSize;
            return Task.FromResult(StoreWideResult);
        }

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
            throw new NotImplementedException();

        public void AddSpaAppointment(SpaAppointment appointment, IReadOnlyList<Guid> serviceIds) =>
            throw new NotImplementedException();

        public Task<bool> IsBookingLockedAsync(Guid customerId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeStaffRoleReader : IStaffRoleReader
    {
        public StaffRole? Role { get; set; }

        public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Role);
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

    private static AppointmentQueryService CreateSut(
        FakeAppointmentQueryRepository? repo = null,
        FakeBookingRepository? bookings = null,
        FakePetRepository? pets = null,
        StaffRole? staffRole = null) =>
        new(
            repo ?? new FakeAppointmentQueryRepository(),
            bookings ?? new FakeBookingRepository(),
            pets ?? new FakePetRepository(),
            new FakeStaffRoleReader { Role = staffRole });

    private static AppointmentListItem CreateItem(Guid id) => new(
        id, AppointmentType.Spa, Guid.NewGuid(), Guid.NewGuid(), "Nguyen Van A", "LuLu",
        AppointmentStatus.Pending, null, null, SizeGroup.Small, null,
        DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), 1,
        null, null, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);

    [Fact]
    public async Task ListAsync_WhenCustomer_CallsRepositoryWithCallerUserId()
    {
        var repo = new FakeAppointmentQueryRepository();
        var bookings = new FakeBookingRepository();
        var sut = CreateSut(repo, bookings);

        await sut.ListAsync(CustomerUser, AppointmentType.Spa, AppointmentStatus.Pending, null, 2, 10);

        Assert.Equal(CustomerUserId, repo.LastCustomerUserId);
        Assert.Equal(AppointmentType.Spa, repo.LastType);
        Assert.Equal(AppointmentStatus.Pending, repo.LastStatus);
        Assert.Null(repo.LastPetId);
        Assert.Equal(2, repo.LastPage);
        Assert.Equal(10, repo.LastPageSize);
        Assert.Equal(0, bookings.ListAppointmentsCalls);
    }

    [Fact]
    public async Task ListAsync_WithPetId_WhenPetNotFound_ThrowsNotFound()
    {
        var sut = CreateSut(pets: new FakePetRepository { PetResult = null });

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.ListAsync(CustomerUser, null, null, Guid.NewGuid(), 1, 20));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WithPetId_WhenPetBelongsToOtherCustomer_ThrowsForbidden()
    {
        var petId = Guid.NewGuid();
        var pets = new FakePetRepository
        {
            PetResult = new PetWithOwner(
                new Pet { PetId = petId, Name = "Mimi", CustomerId = Guid.NewGuid() },
                OtherUserId)
        };
        var sut = CreateSut(pets: pets);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.ListAsync(CustomerUser, null, null, petId, 1, 20));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WithPetId_WhenPetBelongsToCustomer_CallsRepositoryWithPetId()
    {
        var petId = Guid.NewGuid();
        var repo = new FakeAppointmentQueryRepository();
        var pets = new FakePetRepository
        {
            PetResult = new PetWithOwner(
                new Pet { PetId = petId, Name = "Mimi", CustomerId = Guid.NewGuid() },
                CustomerUserId)
        };
        var sut = CreateSut(repo, pets: pets);

        await sut.ListAsync(CustomerUser, AppointmentType.Spa, AppointmentStatus.Completed, petId, 1, 20);

        Assert.Equal(CustomerUserId, repo.LastCustomerUserId);
        Assert.Equal(petId, repo.LastPetId);
    }

    [Fact]
    public async Task ListAsync_WhenManager_ListsStoreWide()
    {
        var repo = new FakeAppointmentQueryRepository();
        var bookings = new FakeBookingRepository();
        var sut = CreateSut(repo, bookings);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        var result = await sut.ListAsync(manager, AppointmentType.Spa, AppointmentStatus.Pending, null, 3, 5);

        Assert.Same(bookings.StoreWideResult, result);
        Assert.Equal(1, bookings.ListAppointmentsCalls);
        Assert.Equal(AppointmentType.Spa, bookings.LastType);
        Assert.Equal(AppointmentStatus.Pending, bookings.LastStatus);
        Assert.Equal(3, bookings.LastPage);
        Assert.Equal(5, bookings.LastPageSize);
        Assert.Null(repo.LastCustomerUserId);
        Assert.Null(repo.LastSpaStaffUserId);
    }

    [Fact]
    public async Task ListAsync_WhenReceptionist_ListsStoreWide()
    {
        var repo = new FakeAppointmentQueryRepository();
        var bookings = new FakeBookingRepository();
        var sut = CreateSut(repo, bookings, staffRole: StaffRole.Receptionist);
        var receptionist = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var result = await sut.ListAsync(receptionist, null, null, null, 1, 20);

        Assert.Same(bookings.StoreWideResult, result);
        Assert.Equal(1, bookings.ListAppointmentsCalls);
        Assert.Null(repo.LastSpaStaffUserId);
    }

    [Fact]
    public async Task ListAsync_WhenSpaStaff_ListsOnlyAssignedToCaller()
    {
        var repo = new FakeAppointmentQueryRepository();
        var bookings = new FakeBookingRepository();
        var sut = CreateSut(repo, bookings, staffRole: StaffRole.SpaStaff);
        var staffUserId = Guid.NewGuid();
        var spaStaff = new CurrentUser(staffUserId, UserRole.Staff);

        var result = await sut.ListAsync(spaStaff, AppointmentType.Spa, AppointmentStatus.Confirmed, null, 2, 10);

        Assert.Same(repo.SpaStaffListResult, result);
        Assert.Equal(staffUserId, repo.LastSpaStaffUserId);
        Assert.Equal(AppointmentType.Spa, repo.LastType);
        Assert.Equal(AppointmentStatus.Confirmed, repo.LastStatus);
        Assert.Equal(2, repo.LastPage);
        Assert.Equal(10, repo.LastPageSize);
        Assert.Equal(0, bookings.ListAppointmentsCalls);
    }

    [Fact]
    public async Task ListAsync_WithDateAndSort_WhenCustomer_ForwardsDateAndSort()
    {
        var repo = new FakeAppointmentQueryRepository();
        var sut = CreateSut(repo);
        var date = new DateOnly(2026, 11, 14);

        await sut.ListAsync(CustomerUser, AppointmentType.Spa, AppointmentStatus.Confirmed, date, null, AppointmentSort.TimeAsc, 1, 20);

        Assert.Equal(CustomerUserId, repo.LastCustomerUserId);
        Assert.Equal(date, repo.LastDate);
        Assert.Equal(AppointmentSort.TimeAsc, repo.LastSort);
    }

    [Fact]
    public async Task ListAsync_WithDateAndSort_WhenManager_ForwardsDateAndSort()
    {
        var bookings = new FakeBookingRepository();
        var sut = CreateSut(bookings: bookings);
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);
        var date = new DateOnly(2026, 11, 14);

        await sut.ListAsync(manager, AppointmentType.Spa, AppointmentStatus.Completed, date, null, AppointmentSort.TimeDesc, 1, 20);

        Assert.Equal(date, bookings.LastDate);
        Assert.Equal(AppointmentSort.TimeDesc, bookings.LastSort);
    }

    [Fact]
    public async Task ListAsync_WithDateAndSort_WhenSpaStaff_ForwardsDateAndSort()
    {
        var repo = new FakeAppointmentQueryRepository();
        var sut = CreateSut(repo, staffRole: StaffRole.SpaStaff);
        var staff = new CurrentUser(Guid.NewGuid(), UserRole.Staff);
        var date = new DateOnly(2026, 11, 14);

        await sut.ListAsync(staff, AppointmentType.Spa, AppointmentStatus.Confirmed, date, null, AppointmentSort.TimeAsc, 1, 20);

        Assert.Equal(date, repo.LastDate);
        Assert.Equal(AppointmentSort.TimeAsc, repo.LastSort);
    }

    [Fact]
    public async Task ListAsync_WhenStaffWithoutProfile_ThrowsForbidden()
    {
        var sut = CreateSut(staffRole: null);
        var user = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.ListAsync(user, null, null, null, 1, 20));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task GetAsync_WhenStaffWithoutProfile_ThrowsForbidden()
    {
        var sut = CreateSut(staffRole: null);
        var user = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.GetAsync(user, Guid.NewGuid()));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task GetAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var sut = CreateSut(new FakeAppointmentQueryRepository { DetailResult = null });

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.GetAsync(CustomerUser, Guid.NewGuid()));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task GetAsync_WhenAppointmentBelongsToOtherCustomer_ThrowsForbidden()
    {
        var apptId = Guid.NewGuid();
        var repo = new FakeAppointmentQueryRepository
        {
            DetailResult = new AppointmentDetailData(CreateItem(apptId), OtherUserId, [], [], null)
        };
        var sut = CreateSut(repo);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.GetAsync(CustomerUser, apptId));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task GetAsync_WhenAppointmentBelongsToCustomer_ReturnsDetail()
    {
        var apptId = Guid.NewGuid();
        var expectedDetail = new AppointmentDetailData(CreateItem(apptId), CustomerUserId, [], [], null);
        var sut = CreateSut(new FakeAppointmentQueryRepository { DetailResult = expectedDetail });

        var result = await sut.GetAsync(CustomerUser, apptId);

        Assert.Same(expectedDetail, result);
    }

    [Fact]
    public async Task GetAsync_WhenManager_ReturnsDetailOfAnyCustomer()
    {
        var apptId = Guid.NewGuid();
        var expectedDetail = new AppointmentDetailData(CreateItem(apptId), OtherUserId, [], [], null);
        var sut = CreateSut(new FakeAppointmentQueryRepository { DetailResult = expectedDetail });
        var manager = new CurrentUser(Guid.NewGuid(), UserRole.Manager);

        var result = await sut.GetAsync(manager, apptId);

        Assert.Same(expectedDetail, result);
    }

    [Fact]
    public async Task GetAsync_WhenReceptionist_ReturnsDetailOfAnyCustomer()
    {
        var apptId = Guid.NewGuid();
        var expectedDetail = new AppointmentDetailData(CreateItem(apptId), OtherUserId, [], [], null);
        var sut = CreateSut(
            new FakeAppointmentQueryRepository { DetailResult = expectedDetail },
            staffRole: StaffRole.Receptionist);
        var receptionist = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var result = await sut.GetAsync(receptionist, apptId);

        Assert.Same(expectedDetail, result);
    }

    [Fact]
    public async Task GetAsync_WhenSpaStaffAssigned_ReturnsDetail()
    {
        var apptId = Guid.NewGuid();
        var expectedDetail = new AppointmentDetailData(CreateItem(apptId), OtherUserId, [], [], null);
        var repo = new FakeAppointmentQueryRepository { DetailResult = expectedDetail, IsAssignedResult = true };
        var sut = CreateSut(repo, staffRole: StaffRole.SpaStaff);
        var spaStaff = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var result = await sut.GetAsync(spaStaff, apptId);

        Assert.Same(expectedDetail, result);
    }

    [Fact]
    public async Task GetAsync_WhenSpaStaffNotAssigned_ThrowsForbidden()
    {
        var apptId = Guid.NewGuid();
        var repo = new FakeAppointmentQueryRepository
        {
            DetailResult = new AppointmentDetailData(CreateItem(apptId), OtherUserId, [], [], null),
            IsAssignedResult = false
        };
        var sut = CreateSut(repo, staffRole: StaffRole.SpaStaff);
        var spaStaff = new CurrentUser(Guid.NewGuid(), UserRole.Staff);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.GetAsync(spaStaff, apptId));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }
}