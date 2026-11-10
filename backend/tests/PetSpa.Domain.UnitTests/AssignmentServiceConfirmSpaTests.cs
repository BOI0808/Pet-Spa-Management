using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AssignmentServiceConfirmSpaTests
{
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid BathId = Guid.NewGuid();
    private static readonly Guid TrimId = Guid.NewGuid();

    private static DateTimeOffset At(int hour, int minute = 0) =>
        new(2026, 11, 14, hour, minute, 0, TimeSpan.Zero);

    // Khoảng giữ chỗ 10:00 – 12:15 (2 giờ + 15 phút dọn dẹp).
    private static SpaAppointment Spa(AppointmentStatus status, short staffRequired) => new()
    {
        AppointmentId = AppointmentId,
        Status = status,
        StaffRequired = staffRequired,
        SizeGroup = SizeGroup.Medium,
        SlotStart = At(10),
        SlotEnd = At(12),
        BusyUntil = At(12, 15),
    };

    private sealed class FakeAssignmentRepository : IAssignmentRepository
    {
        public SpaAppointment? Appointment { get; set; }
        public Dictionary<Guid, string> ActiveStaff { get; set; } = [];
        public List<StaffAssignment> Holding { get; set; } = [];
        public List<AppointmentStaff> Added { get; } = [];

        public Task<SpaAppointmentWindow?> FindSpaWindowAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetSuggestLookbackDaysAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<StaffCandidate>> ListSpaStaffCandidatesAsync(
            DateTimeOffset since, CancellationToken ct = default) =>
            throw new NotImplementedException();

        // Repository thật đã lọc các lượt giữ chỗ giao với khoảng truyền vào; fake trả sẵn danh sách đã lọc.
        public Task<IReadOnlyList<StaffAssignment>> ListHoldingAssignmentsAsync(
            DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<StaffAssignment>>(Holding);

        public Task<SpaAppointment?> FindSpaAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Appointment);

        public Task<IReadOnlyDictionary<Guid, string>> ListActiveSpaStaffNamesAsync(
            IReadOnlyCollection<Guid> staffIds, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyDictionary<Guid, string>>(
                ActiveStaff.Where(kv => staffIds.Contains(kv.Key)).ToDictionary(kv => kv.Key, kv => kv.Value));

        public void AddStaffAssignments(IReadOnlyList<AppointmentStaff> assignments) => Added.AddRange(assignments);
    }

    private sealed class FakeBookingRepository : IBookingRepository
    {
        public List<StaffShift> Shifts { get; set; } = [];

        public Task<IReadOnlyList<StaffShift>> ListSpaStaffShiftsAsync(
            DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<StaffShift>>(Shifts);

        public Task<IReadOnlyList<BookableService>> FindBookableServicesAsync(
            IReadOnlyList<Guid> serviceIds, Species species, SizeGroup sizeGroup, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<int> GetBufferMinutesAsync(CancellationToken ct = default) =>
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

        public Task<PagedResult<AppointmentListItem>> ListAppointmentsAsync(
            AppointmentType? type, AppointmentStatus? status, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakePaymentAmountRepository : IPaymentAmountRepository
    {
        public SpaAmountSnapshot? Snapshot { get; set; }

        public Task<SpaAmountSnapshot?> GetSpaAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(Snapshot);

        public Task<StayAmountSnapshot?> GetStayAsync(Guid appointmentId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<LateFeeConfig> GetLateFeeConfigAsync(CancellationToken ct = default) =>
            throw new NotImplementedException();
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

    // Mặc định: lịch Chờ xác nhận cần 1 nhân viên; hai nhân viên An, Binh đều có ca 08:00 – 22:00;
    // lịch gồm hai dịch vụ giá 150.000 và 120.000 (chó, nhóm Medium).
    private sealed class Fixture
    {
        public Guid StaffA { get; } = Guid.NewGuid();
        public Guid StaffB { get; } = Guid.NewGuid();
        public SpaAppointment Appointment { get; }
        public FakeAssignmentRepository Assignments { get; }
        public FakeBookingRepository Bookings { get; }
        public FakeConcurrencyGuard Guard { get; } = new();
        public AssignmentService Service { get; }

        public Fixture(AppointmentStatus status = AppointmentStatus.Pending, short staffRequired = 1)
        {
            Appointment = Spa(status, staffRequired);
            Assignments = new FakeAssignmentRepository
            {
                Appointment = Appointment,
                ActiveStaff = new() { [StaffA] = "An", [StaffB] = "Binh" },
            };
            Bookings = new FakeBookingRepository
            {
                Shifts = [new StaffShift(StaffA, At(8), At(22)), new StaffShift(StaffB, At(8), At(22))],
            };
            var payments = new FakePaymentAmountRepository
            {
                Snapshot = new SpaAmountSnapshot(
                    Species.Dog, SizeGroup.Medium, status,
                    [BathId, TrimId],
                    [
                        new ServicePricing { ServiceId = BathId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 150_000m },
                        new ServicePricing { ServiceId = TrimId, Species = Species.Dog, SizeGroup = SizeGroup.Medium, Price = 120_000m },
                    ]),
            };
            Service = new AssignmentService(Assignments, Bookings, payments, Guard);
        }
    }

    private static async Task AssertCodeAsync(string expected, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(expected, ex.Code);
    }

    [Fact]
    public async Task ConfirmSpa_WhenValid_AssignsStaffConfirmsAndRecalculatesAmount()
    {
        var f = new Fixture();

        var result = await f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false);

        Assert.Equal(AppointmentStatus.Confirmed, result.Status);
        Assert.Equal(AppointmentStatus.Confirmed, f.Appointment.Status);
        Assert.Equal(270_000m, result.Amount);

        var row = Assert.Single(f.Assignments.Added);
        Assert.Equal(f.StaffA, row.StaffId);
        Assert.Equal(At(10), row.BusyFrom);
        Assert.Equal(At(12, 15), row.BusyUntil);
        Assert.True(row.IsHolding);
        Assert.Equal(AppointmentId, f.Guard.LockedAppointmentId);
    }

    [Fact]
    public async Task ConfirmSpa_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        f.Assignments.Appointment = null;

        await AssertCodeAsync(ErrorCodes.NotFound,
            () => f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false));
    }

    [Fact]
    public async Task ConfirmSpa_WhenNotPending_ThrowsInvalidTransition()
    {
        var f = new Fixture(AppointmentStatus.Confirmed);

        await AssertCodeAsync(ErrorCodes.InvalidTransition,
            () => f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false));

        Assert.Empty(f.Assignments.Added);
    }

    [Fact]
    public async Task ConfirmSpa_WhenStaffCountDiffersFromRequired_ThrowsStaffCountMismatch()
    {
        var f = new Fixture(staffRequired: 2);

        await AssertCodeAsync(ErrorCodes.StaffCountMismatch,
            () => f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false));

        Assert.Empty(f.Assignments.Added);
        Assert.Equal(AppointmentStatus.Pending, f.Appointment.Status);
    }

    [Fact]
    public async Task ConfirmSpa_WhenStaffIsNotActiveSpaStaff_ThrowsValidationError()
    {
        var f = new Fixture();

        await AssertCodeAsync(ErrorCodes.ValidationError,
            () => f.Service.ConfirmSpaAsync(AppointmentId, [Guid.NewGuid()], confirmOutOfShift: false));

        Assert.Empty(f.Assignments.Added);
    }

    [Fact]
    public async Task ConfirmSpa_WhenStaffAlreadyHeldInOverlappingTime_ThrowsStaffConflict()
    {
        var f = new Fixture();
        f.Assignments.Holding = [new StaffAssignment(f.StaffA, At(11), At(13))];

        await AssertCodeAsync(ErrorCodes.StaffConflict,
            () => f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false));

        Assert.Empty(f.Assignments.Added);
        Assert.Equal(AppointmentStatus.Pending, f.Appointment.Status);
    }

    [Fact]
    public async Task ConfirmSpa_WhenAnotherStaffIsHeld_StillConfirmsChosenStaff()
    {
        var f = new Fixture();
        f.Assignments.Holding = [new StaffAssignment(f.StaffB, At(11), At(13))];

        var result = await f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false);

        Assert.Equal(AppointmentStatus.Confirmed, result.Status);
    }

    [Fact]
    public async Task ConfirmSpa_WhenStaffOutOfShiftAndNotConfirmedAgain_ThrowsStaffOutOfShiftWithStaffName()
    {
        var f = new Fixture();
        f.Bookings.Shifts = [new StaffShift(f.StaffB, At(8), At(22))]; // An không có ca

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: false));

        Assert.Equal(ErrorCodes.StaffOutOfShift, ex.Code);
        Assert.Contains(": An.", ex.Detail); // tên nhân viên đứng ngay sau dấu hai chấm
        Assert.Empty(f.Assignments.Added);
        Assert.Equal(AppointmentStatus.Pending, f.Appointment.Status);
    }

    [Fact]
    public async Task ConfirmSpa_WhenStaffOutOfShiftButConfirmedAgain_Confirms()
    {
        var f = new Fixture();
        f.Bookings.Shifts = [new StaffShift(f.StaffB, At(8), At(22))]; // An không có ca

        var result = await f.Service.ConfirmSpaAsync(AppointmentId, [f.StaffA], confirmOutOfShift: true);

        Assert.Equal(AppointmentStatus.Confirmed, result.Status);
        Assert.Single(f.Assignments.Added);
    }
}

