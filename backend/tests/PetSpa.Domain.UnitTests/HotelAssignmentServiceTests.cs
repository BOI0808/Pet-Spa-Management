using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelAssignmentServiceTests
{
    private static readonly TimeSpan StoreOffset = TimeSpan.FromHours(7);
    private static readonly TimeZoneInfo StoreTimeZone =
        TimeZoneInfo.CreateCustomTimeZone("StoreTime", StoreOffset, "StoreTime", "StoreTime");

    private static readonly Guid AppointmentId = Guid.NewGuid();

    private static DateTimeOffset Local(int day, int hour) =>
        new(2026, 11, day, hour, 0, 0, StoreOffset);

    private static HotelAppointment Stay(AppointmentStatus status = AppointmentStatus.Pending) => new()
    {
        AppointmentId = AppointmentId,
        Status = status,
        SizeGroup = SizeGroup.Small,
        PlannedCheckIn = Local(10, 14),
        PlannedCheckOut = Local(12, 12),
    };

    private static Cage CageOf(
        string code, Species species = Species.Dog, SizeGroup sizeGroup = SizeGroup.Small, bool isActive = true) => new()
    {
        CageId = Guid.NewGuid(),
        Code = code,
        Species = species,
        SizeGroup = sizeGroup,
        IsActive = isActive,
    };

    private sealed class FakeHotelAssignmentRepository : IHotelAssignmentRepository
    {
        public Appointment? AppointmentResult { get; set; }
        public HotelAppointmentWithSpecies? Found { get; set; }
        public Cage? CageResult { get; set; }
        public List<Cage> ActiveCages { get; set; } = [];
        public List<HotelAppointment> AssignedStays { get; set; } = [];

        public Task<Appointment?> FindAppointmentAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(AppointmentResult ?? Found?.Appointment);

        public Task<HotelAppointmentWithSpecies?> FindHotelAppointmentAsync(
            Guid appointmentId, bool asNoTracking = false, CancellationToken ct = default) =>
            Task.FromResult(Found);

        public Task<Cage?> FindCageAsync(Guid cageId, CancellationToken ct = default) =>
            Task.FromResult(CageResult);

        public Task<IReadOnlyList<Cage>> ListActiveCagesAsync(
            Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Cage>>(ActiveCages);

        public Task<IReadOnlyList<HotelAppointment>> ListAssignedStaysAsync(
            Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<HotelAppointment>>(AssignedStays);
    }

    private sealed class FakeTimeZoneProvider(TimeZoneInfo tz) : IStoreTimeZoneProvider
    {
        public TimeZoneInfo GetStoreTimeZone() => tz;
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public Guid? LockedAppointmentId { get; private set; }
        public (Species Species, SizeGroup SizeGroup)? LockedHotelGroup { get; private set; }

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default)
        {
            LockedHotelGroup = (species, sizeGroup);
            return Task.CompletedTask;
        }
        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            LockedAppointmentId = appointmentId;
            return Task.CompletedTask;
        }
        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default) => Task.CompletedTask;
    }

    private static (HotelAssignmentService service, FakeHotelAssignmentRepository repository, FakeConcurrencyGuard guard) CreateService(
        HotelAppointment? stay = null)
    {
        var repository = new FakeHotelAssignmentRepository
        {
            Found = new HotelAppointmentWithSpecies(stay ?? Stay(), Species.Dog),
        };
        var guard = new FakeConcurrencyGuard();
        var service = new HotelAssignmentService(repository, new FakeTimeZoneProvider(StoreTimeZone), guard);
        return (service, repository, guard);
    }

    private static async Task AssertCodeAsync(string expected, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(expected, ex.Code);
    }

    [Fact]
    public async Task SuggestCage_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var (service, repository, _) = CreateService();
        repository.Found = null;

        await AssertCodeAsync(ErrorCodes.NotFound, () => service.SuggestCageAsync(AppointmentId));
    }

    [Fact]
    public async Task SuggestCage_WhenNotPending_ThrowsInvalidTransition()
    {
        var (service, _, _) = CreateService(Stay(AppointmentStatus.Confirmed));

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => service.SuggestCageAsync(AppointmentId));
    }

    [Fact]
    public async Task SuggestCage_WhenSeveralFree_ReturnsCageWithLowestCode()
    {
        var (service, repository, _) = CreateService();
        var a1 = CageOf("A1");
        repository.ActiveCages = [CageOf("B2"), a1];

        var result = await service.SuggestCageAsync(AppointmentId);

        Assert.Equal(a1.CageId, result?.CageId);
    }

    [Fact]
    public async Task SuggestCage_WhenFirstCageOccupiedOnOverlappingNights_ReturnsNextCage()
    {
        var (service, repository, _) = CreateService();
        var a1 = CageOf("A1");
        var b2 = CageOf("B2");
        repository.ActiveCages = [a1, b2];
        repository.AssignedStays =
        [
            new HotelAppointment { CageId = a1.CageId, PlannedCheckIn = Local(11, 14), PlannedCheckOut = Local(13, 12) },
        ];

        var result = await service.SuggestCageAsync(AppointmentId);

        Assert.Equal(b2.CageId, result?.CageId);
    }

    [Fact]
    public async Task SuggestCage_WhenNoCageFree_ReturnsNull()
    {
        var (service, _, _) = CreateService();

        var result = await service.SuggestCageAsync(AppointmentId);

        Assert.Null(result);
    }

    [Fact]
    public async Task Confirm_WhenValid_ConfirmsAssignsCageAndLocksAppointment()
    {
        var (service, repository, guard) = CreateService();
        var cage = CageOf("A1");
        repository.CageResult = cage;

        var status = await service.ConfirmAsync(AppointmentId, cage.CageId);

        Assert.Equal(AppointmentStatus.Confirmed, status);
        Assert.Equal(cage.CageId, repository.Found!.Appointment.CageId);
        Assert.Equal(AppointmentId, guard.LockedAppointmentId);
        Assert.Equal((Species.Dog, SizeGroup.Small), guard.LockedHotelGroup);
    }

    [Fact]
    public async Task Confirm_WhenCageOccupiedInSameNights_ThrowsCageConflict()
    {
        var (service, repository, _) = CreateService();
        var cage = CageOf("A1");
        repository.CageResult = cage;
        repository.AssignedStays =
        [
            new HotelAppointment
            {
                AppointmentId = Guid.NewGuid(),
                CageId = cage.CageId,
                PlannedCheckIn = Local(10, 14),
                PlannedCheckOut = Local(11, 12),
                Status = AppointmentStatus.Confirmed
            }
        ];

        await AssertCodeAsync(ErrorCodes.CageConflict, () => service.ConfirmAsync(AppointmentId, cage.CageId));

        Assert.Equal(AppointmentStatus.Pending, repository.Found!.Appointment.Status);
        Assert.Null(repository.Found.Appointment.CageId);
    }

    [Fact]
    public async Task Confirm_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var (service, repository, _) = CreateService();
        repository.Found = null;
        repository.CageResult = CageOf("A1");

        await AssertCodeAsync(ErrorCodes.NotFound, () => service.ConfirmAsync(AppointmentId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Confirm_WhenCageNotFound_ThrowsNotFound()
    {
        var (service, _, _) = CreateService();

        await AssertCodeAsync(ErrorCodes.NotFound, () => service.ConfirmAsync(AppointmentId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Confirm_WhenCageSpeciesDiffers_ThrowsCageConflictAndKeepsPending()
    {
        var (service, repository, _) = CreateService();
        repository.CageResult = CageOf("A1", species: Species.Cat);

        await AssertCodeAsync(ErrorCodes.CageConflict, () => service.ConfirmAsync(AppointmentId, Guid.NewGuid()));

        Assert.Equal(AppointmentStatus.Pending, repository.Found!.Appointment.Status);
        Assert.Null(repository.Found.Appointment.CageId);
    }

    [Fact]
    public async Task Confirm_WhenAlreadyConfirmed_ThrowsInvalidTransition()
    {
        var (service, repository, _) = CreateService(Stay(AppointmentStatus.Confirmed));
        repository.CageResult = CageOf("A1");

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => service.ConfirmAsync(AppointmentId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Reject_WhenPending_CancelsWithStoreUnableAndLocksAppointment()
    {
        var (service, repository, guard) = CreateService();

        var result = await service.RejectAsync(AppointmentId);

        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        Assert.Equal(CancelReason.StoreUnable, result.Reason);
        Assert.Equal(AppointmentStatus.Cancelled, repository.Found!.Appointment.Status);
        Assert.Equal(AppointmentId, guard.LockedAppointmentId);
    }

    [Fact]
    public async Task Reject_WhenSpaAppointment_CancelsWithStoreUnable()
    {
        var spaAppointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Pending
        };
        var repository = new FakeHotelAssignmentRepository
        {
            AppointmentResult = spaAppointment
        };
        var guard = new FakeConcurrencyGuard();
        var service = new HotelAssignmentService(repository, new FakeTimeZoneProvider(StoreTimeZone), guard);

        var result = await service.RejectAsync(spaAppointment.AppointmentId);

        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        Assert.Equal(CancelReason.StoreUnable, result.Reason);
        Assert.Equal(AppointmentStatus.Cancelled, spaAppointment.Status);
        Assert.Equal(spaAppointment.AppointmentId, guard.LockedAppointmentId);
    }

    [Fact]
    public async Task Reject_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var (service, repository, _) = CreateService();
        repository.Found = null;

        await AssertCodeAsync(ErrorCodes.NotFound, () => service.RejectAsync(AppointmentId));
    }

    [Fact]
    public async Task Reject_WhenConfirmed_ThrowsInvalidTransition()
    {
        var (service, repository, _) = CreateService(Stay(AppointmentStatus.Confirmed));

        await AssertCodeAsync(ErrorCodes.InvalidTransition, () => service.RejectAsync(AppointmentId));

        Assert.Equal(AppointmentStatus.Confirmed, repository.Found!.Appointment.Status);
    }
}