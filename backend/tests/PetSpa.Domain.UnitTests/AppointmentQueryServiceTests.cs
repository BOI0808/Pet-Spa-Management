using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
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
        public AppointmentType? LastType { get; private set; }
        public AppointmentStatus? LastStatus { get; private set; }
        public Guid? LastPetId { get; private set; }
        public int LastPage { get; private set; }
        public int LastPageSize { get; private set; }
        public PagedResult<AppointmentListItem> ListResult { get; set; } = new([], 1, 20, 0);

        public AppointmentDetailData? DetailResult { get; set; }

        public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
            Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, int page, int pageSize,
            CancellationToken ct = default)
        {
            LastCustomerUserId = customerUserId;
            LastType = type;
            LastStatus = status;
            LastPetId = petId;
            LastPage = page;
            LastPageSize = pageSize;
            return Task.FromResult(ListResult);
        }

        public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(DetailResult);
    }

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

    private static AppointmentListItem CreateItem(Guid id) => new(
        id, AppointmentType.Spa, Guid.NewGuid(), Guid.NewGuid(), "Nguyen Van A", "LuLu",
        AppointmentStatus.Pending, null, null, SizeGroup.Small, null,
        DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), 1,
        null, null, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);

    [Theory]
    [InlineData(UserRole.Manager)]
    [InlineData(UserRole.Staff)]
    public async Task ListAsync_WhenNotCustomer_ThrowsForbidden(UserRole role)
    {
        var repo = new FakeAppointmentQueryRepository();
        var pets = new FakePetRepository();
        var sut = new AppointmentQueryService(repo, pets);
        var user = new CurrentUser(Guid.NewGuid(), role);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.ListAsync(user, null, null, null, 1, 20));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WhenCustomer_CallsRepositoryWithCallerUserId()
    {
        var repo = new FakeAppointmentQueryRepository();
        var pets = new FakePetRepository();
        var sut = new AppointmentQueryService(repo, pets);

        await sut.ListAsync(CustomerUser, AppointmentType.Spa, AppointmentStatus.Pending, null, 2, 10);

        Assert.Equal(CustomerUserId, repo.LastCustomerUserId);
        Assert.Equal(AppointmentType.Spa, repo.LastType);
        Assert.Equal(AppointmentStatus.Pending, repo.LastStatus);
        Assert.Null(repo.LastPetId);
        Assert.Equal(2, repo.LastPage);
        Assert.Equal(10, repo.LastPageSize);
    }

    [Fact]
    public async Task ListAsync_WithPetId_WhenPetNotFound_ThrowsNotFound()
    {
        var repo = new FakeAppointmentQueryRepository();
        var pets = new FakePetRepository { PetResult = null };
        var sut = new AppointmentQueryService(repo, pets);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.ListAsync(CustomerUser, null, null, Guid.NewGuid(), 1, 20));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
    }

    [Fact]
    public async Task ListAsync_WithPetId_WhenPetBelongsToOtherCustomer_ThrowsForbidden()
    {
        var petId = Guid.NewGuid();
        var repo = new FakeAppointmentQueryRepository();
        var pets = new FakePetRepository
        {
            PetResult = new PetWithOwner(
                new Pet { PetId = petId, Name = "Mimi", CustomerId = Guid.NewGuid() },
                OtherUserId)
        };
        var sut = new AppointmentQueryService(repo, pets);

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
        var sut = new AppointmentQueryService(repo, pets);

        await sut.ListAsync(CustomerUser, AppointmentType.Spa, AppointmentStatus.Completed, petId, 1, 20);

        Assert.Equal(CustomerUserId, repo.LastCustomerUserId);
        Assert.Equal(petId, repo.LastPetId);
    }

    [Theory]
    [InlineData(UserRole.Manager)]
    [InlineData(UserRole.Staff)]
    public async Task GetAsync_WhenNotCustomer_ThrowsForbidden(UserRole role)
    {
        var repo = new FakeAppointmentQueryRepository();
        var pets = new FakePetRepository();
        var sut = new AppointmentQueryService(repo, pets);
        var user = new CurrentUser(Guid.NewGuid(), role);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.GetAsync(user, Guid.NewGuid()));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task GetAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var repo = new FakeAppointmentQueryRepository { DetailResult = null };
        var pets = new FakePetRepository();
        var sut = new AppointmentQueryService(repo, pets);

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
        var pets = new FakePetRepository();
        var sut = new AppointmentQueryService(repo, pets);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            sut.GetAsync(CustomerUser, apptId));

        Assert.Equal(ErrorCodes.Forbidden, ex.Code);
    }

    [Fact]
    public async Task GetAsync_WhenAppointmentBelongsToCustomer_ReturnsDetail()
    {
        var apptId = Guid.NewGuid();
        var expectedDetail = new AppointmentDetailData(CreateItem(apptId), CustomerUserId, [], [], null);
        var repo = new FakeAppointmentQueryRepository { DetailResult = expectedDetail };
        var pets = new FakePetRepository();
        var sut = new AppointmentQueryService(repo, pets);

        var result = await sut.GetAsync(CustomerUser, apptId);

        Assert.Same(expectedDetail, result);
    }
}
