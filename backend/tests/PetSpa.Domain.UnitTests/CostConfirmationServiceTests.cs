using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CostConfirmationServiceTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid PetId = Guid.NewGuid();
    private static readonly Guid CustomerUserId = Guid.NewGuid();
    private static readonly Guid ReceptionistUserId = Guid.NewGuid();
    private static readonly Guid SpaStaffUserId = Guid.NewGuid();

    private static readonly CurrentUser Owner = new(CustomerUserId, UserRole.Customer);
    private static readonly CurrentUser OtherCustomer = new(Guid.NewGuid(), UserRole.Customer);
    private static readonly CurrentUser Receptionist = new(ReceptionistUserId, UserRole.Staff);
    private static readonly CurrentUser SpaStaff = new(SpaStaffUserId, UserRole.Staff);
    private static readonly CurrentUser Manager = new(Guid.NewGuid(), UserRole.Manager);

    private sealed class FakeChangeRepository : IAppointmentChangeRepository
    {
        public Appointment? Stored { get; set; }
        public Guid? OwnerUserId { get; set; } = CustomerUserId;
        public bool StaffReleased { get; private set; }

        public Task<AppointmentWithOwner?> FindWithOwnerAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<AppointmentWithOwner?>(Stored is null ? null : new AppointmentWithOwner(Stored, OwnerUserId));

        public Task ReleaseStaffHoldsAsync(Guid appointmentId, CancellationToken ct = default)
        {
            StaffReleased = true;
            return Task.CompletedTask;
        }

        public Task<int> GetChangeDeadlineMinutesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public Task ReplaceServicesAsync(Guid appointmentId, IReadOnlyList<Guid> serviceIds, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveStaffAssignmentsAsync(Guid appointmentId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<Guid>> ListHoldingStaffIdsAsync(Guid appointmentId, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<Guid>>([]);
    }

    private sealed class FakePetRepository : IPetRepository
    {
        public Pet Pet { get; set; } = new();

        public Task<PetWithOwner?> FindWithOwnerAsync(Guid petId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult<PetWithOwner?>(new PetWithOwner(Pet, CustomerUserId));

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

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public Cage? Cage { get; set; }

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) => Task.FromResult(Cage);

        public Task<Appointment?> FindAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> IsCageOccupiedAsync(Guid cageId, Guid currentAppointmentId, CancellationToken ct = default) =>
            Task.FromResult(false);
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

    private sealed class FakeStaffRoleReader : IStaffRoleReader
    {
        public Dictionary<Guid, StaffRole> Roles { get; } = [];
        public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Roles.TryGetValue(userId, out var role) ? role : (StaffRole?)null);
    }

    private sealed class Fixture
    {
        public FakeChangeRepository Changes { get; } = new();
        public FakeCostConfirmationRepository Confirmations { get; } = new();
        public FakePetRepository Pets { get; } = new();
        public FakeHotelAssignmentRepository Hotel { get; } = new();
        public FakeStaffRoleReader StaffRoles { get; } = new();
        public FakeStayPaymentRepository Payments { get; } = new();
        public CostConfirmationService Service { get; }

        public Fixture()
        {
            StaffRoles.Roles[ReceptionistUserId] = StaffRole.Receptionist;
            StaffRoles.Roles[SpaStaffUserId] = StaffRole.SpaStaff;
            Service = new CostConfirmationService(Changes, Confirmations, Pets, Hotel, new FakeConcurrencyGuard(), StaffRoles, Payments, TestNotifier.Create());
        }
    }

    private static SpaAppointment ReceivedSpa(AppointmentStatus status = AppointmentStatus.Received) => new()
    {
        AppointmentId = AppointmentId,
        PetId = PetId,
        Status = status,
        SizeGroup = SizeGroup.Small,
        ActualWeightKg = 3.4m,
        StaffRequired = 1,
    };

    private static HotelAppointment ConfirmedStay(Guid? cageId) => new()
    {
        AppointmentId = AppointmentId,
        PetId = PetId,
        Status = AppointmentStatus.Confirmed,
        SizeGroup = SizeGroup.Small,
        ActualWeightKg = 3.4m,
        CageId = cageId,
    };

    private static Cage CatCage(SizeGroup sizeGroup) => new()
    {
        CageId = Guid.NewGuid(),
        Code = "A1",
        Species = Species.Cat,
        SizeGroup = sizeGroup,
        IsActive = true,
    };

    private static Fixture Create(Appointment appointment, DateTimeOffset? expiresAt = null, bool withPending = true)
    {
        var fixture = new Fixture();
        fixture.Changes.Stored = appointment;
        fixture.Pets.Pet = new Pet
        {
            PetId = PetId,
            CustomerId = Guid.NewGuid(),
            Species = Species.Cat,
            WeightKg = 2.8m,
            SizeGroup = SizeGroup.Small,
        };

        if (withPending)
        {
            fixture.Confirmations.Added.Add(new CostConfirmation
            {
                ConfirmationId = Guid.NewGuid(),
                AppointmentId = AppointmentId,
                ActualWeightKg = 3.4m,
                NewSizeGroup = SizeGroup.Medium,
                OldAmount = 100000m,
                NewAmount = 150000m,
                Status = ConfirmationStatus.Pending,
                ExpiresAt = expiresAt ?? DateTimeOffset.UtcNow.AddMinutes(20),
            });
        }

        return fixture;
    }

    private static async Task AssertErrorAsync(string code, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public async Task Respond_AcceptOnSpa_UpdatesPetAndAppointmentGroupAndKeepsReceived()
    {
        var spa = ReceivedSpa();
        var f = Create(spa);

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: true);

        var confirmation = Assert.Single(f.Confirmations.Added);
        Assert.Equal(ConfirmationStatus.Accepted, confirmation.Status);
        Assert.Equal(CustomerUserId, confirmation.RespondedByUserId);
        Assert.NotNull(confirmation.RespondedAt);
        Assert.Equal(AppointmentStatus.Received, result.Status);
        Assert.Null(result.CageSuitable);
        Assert.Equal(SizeGroup.Medium, spa.SizeGroup);
        Assert.Equal(3.4m, f.Pets.Pet.WeightKg);
        Assert.Equal(SizeGroup.Medium, f.Pets.Pet.SizeGroup);
        Assert.False(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Respond_AcceptOnHotelWhenCageHasOldGroup_ReturnsCageSuitableFalseAndKeepsCage()
    {
        var cage = CatCage(SizeGroup.Small);
        var stay = ConfirmedStay(cage.CageId);
        var f = Create(stay);
        f.Hotel.Cage = cage;

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: true);

        Assert.Equal(AppointmentStatus.Confirmed, result.Status);
        Assert.False(result.CageSuitable);
        Assert.Equal(SizeGroup.Medium, stay.SizeGroup);
        Assert.Equal(cage.CageId, stay.CageId);
        Assert.Equal(SizeGroup.Medium, f.Pets.Pet.SizeGroup);
    }

    [Fact]
    public async Task Respond_AcceptOnHotelWhenCageMatchesNewGroup_ReturnsCageSuitableTrue()
    {
        var cage = CatCage(SizeGroup.Medium);
        var stay = ConfirmedStay(cage.CageId);
        var f = Create(stay);
        f.Hotel.Cage = cage;

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: true);

        Assert.True(result.CageSuitable);
    }

    [Fact]
    public async Task Respond_RejectOnSpa_CancelsWithCostNotConfirmedAndReleasesStaff()
    {
        var spa = ReceivedSpa();
        var f = Create(spa);

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: false);

        var confirmation = Assert.Single(f.Confirmations.Added);
        Assert.Equal(ConfirmationStatus.Rejected, confirmation.Status);
        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        Assert.Null(result.CageSuitable);
        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
        Assert.Equal(CancelReason.CostNotConfirmed, spa.CancelReason);
        Assert.True(f.Changes.StaffReleased);
        Assert.Equal(SizeGroup.Small, spa.SizeGroup);
        Assert.Equal(2.8m, f.Pets.Pet.WeightKg);
    }

    [Fact]
    public async Task Respond_RejectOnHotel_CancelsWithCostNotConfirmedWithoutReleasingStaff()
    {
        var stay = ConfirmedStay(Guid.NewGuid());
        var f = Create(stay);

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: false);

        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        Assert.Equal(CancelReason.CostNotConfirmed, stay.CancelReason);
        Assert.False(f.Changes.StaffReleased);
        Assert.Equal(2.8m, f.Pets.Pet.WeightKg);
    }

    [Fact]
    public async Task Respond_ByReceptionistOnWalkInAppointment_Succeeds()
    {
        var spa = ReceivedSpa();
        var f = Create(spa);
        f.Changes.OwnerUserId = null;

        var result = await f.Service.RespondAsync(Receptionist, AppointmentId, accept: true);

        var confirmation = Assert.Single(f.Confirmations.Added);
        Assert.Equal(ConfirmationStatus.Accepted, confirmation.Status);
        Assert.Equal(ReceptionistUserId, confirmation.RespondedByUserId);
        Assert.Equal(AppointmentStatus.Received, result.Status);
    }

    [Fact]
    public async Task Respond_ByOtherCustomer_ThrowsForbiddenAndChangesNothing()
    {
        var spa = ReceivedSpa();
        var f = Create(spa);

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.RespondAsync(OtherCustomer, AppointmentId, accept: true));

        Assert.Equal(ConfirmationStatus.Pending, f.Confirmations.Added[0].Status);
        Assert.Equal(SizeGroup.Small, spa.SizeGroup);
    }

    [Fact]
    public async Task Respond_ByCustomerOnWalkInAppointment_ThrowsForbidden()
    {
        var f = Create(ReceivedSpa());
        f.Changes.OwnerUserId = null;

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.RespondAsync(Owner, AppointmentId, accept: true));
    }

    [Fact]
    public async Task Respond_ByManager_ThrowsForbidden()
    {
        var f = Create(ReceivedSpa());

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.RespondAsync(Manager, AppointmentId, accept: true));
    }

    [Fact]
    public async Task Respond_BySpaStaff_ThrowsForbidden()
    {
        var f = Create(ReceivedSpa());

        await AssertErrorAsync(ErrorCodes.Forbidden, () => f.Service.RespondAsync(SpaStaff, AppointmentId, accept: true));
    }

    [Fact]
    public async Task Respond_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var f = new Fixture();

        await AssertErrorAsync(ErrorCodes.NotFound, () => f.Service.RespondAsync(Owner, AppointmentId, accept: true));
    }

    [Fact]
    public async Task Respond_WhenNoPendingConfirmation_ThrowsNotFound()
    {
        var f = Create(ReceivedSpa(), withPending: false);

        await AssertErrorAsync(ErrorCodes.NotFound, () => f.Service.RespondAsync(Owner, AppointmentId, accept: true));
    }

    [Fact]
    public async Task Respond_WhenExpired_CancelsAppointmentAndMarksExpired()
    {
        var spa = ReceivedSpa();
        var f = Create(spa, expiresAt: DateTimeOffset.UtcNow.AddMinutes(-1));

        await AssertErrorAsync(ErrorCodes.CostConfirmationExpired, () => f.Service.RespondAsync(Owner, AppointmentId, accept: false));

        Assert.Equal(ConfirmationStatus.Expired, f.Confirmations.Added[0].Status);
        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
        Assert.Equal(CancelReason.CostNotConfirmed, spa.CancelReason);
        Assert.True(f.Changes.StaffReleased);
    }

    [Fact]
    public async Task Respond_WhenSpaIsNotReceived_ThrowsInvalidTransition()
    {
        var f = Create(ReceivedSpa(AppointmentStatus.Confirmed));

        await AssertErrorAsync(ErrorCodes.InvalidTransition, () => f.Service.RespondAsync(Owner, AppointmentId, accept: true));
    }

    [Fact]
    public async Task Respond_WhenAcceptedForHotelStay_UpdatesUnpaidStayPaymentAmount()
    {
        var stay = ConfirmedStay(cageId: null);
        var f = Create(stay);
        var stayPayment = new Payment
        {
            PaymentId = Guid.NewGuid(),
            AppointmentId = AppointmentId,
            Kind = PaymentKind.Stay,
            Amount = 100_000m,
        };
        f.Payments.Payments.Add(stayPayment);

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: true);

        Assert.Equal(AppointmentStatus.Confirmed, result.Status);
        Assert.Equal(150_000m, stayPayment.Amount);
    }

    [Fact]
    public async Task Respond_WhenAcceptedForSpa_DoesNotModifyStayPayment()
    {
        var spa = ReceivedSpa();
        var f = Create(spa);
        var stayPayment = new Payment
        {
            PaymentId = Guid.NewGuid(),
            AppointmentId = AppointmentId,
            Kind = PaymentKind.Stay,
            Amount = 100_000m,
        };
        f.Payments.Payments.Add(stayPayment);

        var result = await f.Service.RespondAsync(Owner, AppointmentId, accept: true);

        Assert.Equal(AppointmentStatus.Received, result.Status);
        Assert.Equal(100_000m, stayPayment.Amount);
    }
}