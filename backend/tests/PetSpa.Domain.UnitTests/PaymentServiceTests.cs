using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PaymentServiceTests
{
    private const decimal Due = 300_000m;
    private static readonly Guid PaymentId = Guid.NewGuid();
    private static readonly Guid AppointmentId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private static readonly CurrentUser Receptionist = new(Guid.NewGuid(), UserRole.Staff);
    private static readonly CurrentUser Manager = new(Guid.NewGuid(), UserRole.Manager);
    private static readonly CurrentUser CustomerOwner = new(OwnerUserId, UserRole.Customer);
    private static readonly CurrentUser OtherCustomer = new(Guid.NewGuid(), UserRole.Customer);
    private static readonly CurrentUser SpaStaff = new(Guid.NewGuid(), UserRole.Staff);

    private sealed class FakePaymentRepository : IPaymentRepository
    {
        public Payment? Stored { get; set; }
        public AppointmentStatus AppointmentStatus { get; set; }
        public AppointmentStatus? LatestAppointmentStatus { get; set; }

        public Dictionary<Guid, List<Payment>> AppointmentPayments { get; } = [];
        public PagedResult<Payment> PagedResultToReturn { get; set; } = new([], 1, 20, 0);
        public PaymentStatus? LastStatus { get; private set; }
        public int LastPage { get; private set; }
        public int LastPageSize { get; private set; }
        public List<PaymentTransaction> Transactions { get; } = [];

        public Task<PaymentWithAppointmentStatus?> FindWithAppointmentStatusAsync(
            Guid paymentId, CancellationToken ct = default) =>
            Task.FromResult<PaymentWithAppointmentStatus?>(
                Stored is not null && Stored.PaymentId == paymentId
                    ? new PaymentWithAppointmentStatus(Stored, AppointmentStatus)
                    : null);

        public Task<AppointmentStatus?> GetAppointmentStatusAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(LatestAppointmentStatus ?? (AppointmentStatus?)AppointmentStatus);

        public Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            AppointmentPayments.TryGetValue(appointmentId, out var list);
            return Task.FromResult<IReadOnlyList<Payment>>(list ?? []);
        }

        public Task<PagedResult<Payment>> ListAsync(
            PaymentStatus? status, int page, int pageSize, CancellationToken ct = default)
        {
            LastStatus = status;
            LastPage = page;
            LastPageSize = pageSize;
            return Task.FromResult(PagedResultToReturn);
        }

        public void Add(Payment payment) => throw new NotImplementedException();

        public Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default)
        {
            Transactions.Add(transaction);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeConcurrencyGuard : IConcurrencyGuard
    {
        public List<Guid> LockedPaymentIds { get; } = [];
        public List<Guid> LockedAppointmentIds { get; } = [];

        public Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct = default) => work();
        public Task RunAsync(Func<Task> work, CancellationToken ct = default) => work();
        public Task LockSpaDayAsync(DateOnly day, CancellationToken ct = default) => Task.CompletedTask;
        public Task LockHotelGroupAsync(Species species, SizeGroup sizeGroup, CancellationToken ct = default) => Task.CompletedTask;

        public Task LockAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
        {
            LockedAppointmentIds.Add(appointmentId);
            return Task.CompletedTask;
        }

        public Task LockPaymentAsync(Guid paymentId, CancellationToken ct = default)
        {
            LockedPaymentIds.Add(paymentId);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeAppointmentQueryRepository : IAppointmentQueryRepository
    {
        public AppointmentDetailData? DetailResult { get; set; }
        public bool IsAssignedResult { get; set; }

        public Task<PagedResult<AppointmentListItem>> ListByCustomerUserAsync(
            Guid customerUserId, AppointmentType? type, AppointmentStatus? status, Guid? petId, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<AppointmentDetailData?> FindDetailAsync(Guid appointmentId, CancellationToken ct = default) =>
            Task.FromResult(DetailResult);

        public Task<PagedResult<AppointmentListItem>> ListBySpaStaffUserAsync(
            Guid staffUserId, AppointmentType? type, AppointmentStatus? status, DateOnly? date,
            AppointmentSort? sort, int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<bool> IsAssignedToSpaStaffAsync(Guid appointmentId, Guid staffUserId, CancellationToken ct = default) =>
            Task.FromResult(IsAssignedResult);
    }

    private sealed class FakeStaffRoleReader : IStaffRoleReader
    {
        public StaffRole? Role { get; set; }

        public Task<StaffRole?> GetStaffRoleAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Role);
    }

    private sealed class FakePaymentGateway : IPaymentGateway
    {
        public PaymentGateway Gateway => PaymentGateway.VNPAY;
        public PaymentGatewayRequest? LastRequest { get; private set; }
        public PaymentGatewayCallback CallbackToReturn { get; set; } = new(true, string.Empty, null, false);

        public string CreatePaymentUrl(PaymentGatewayRequest request)
        {
            LastRequest = request;
            return $"https://pay.test/{request.TxnRef}";
        }

        public PaymentGatewayCallback VerifyCallback(IReadOnlyDictionary<string, string> parameters) =>
            CallbackToReturn;
    }

    private sealed class Fixture
    {
        public FakePaymentRepository Payments { get; } = new();
        public FakeCostConfirmationRepository Confirmations { get; } = new();
        public FakeConcurrencyGuard Guard { get; } = new();
        public FakeAppointmentQueryRepository AppointmentQueryRepo { get; } = new();
        public FakeStaffRoleReader StaffRoles { get; } = new();
        public FakePaymentGateway Gateway { get; } = new();
        public AppointmentQueryService AppointmentQueries { get; }
        public PaymentService Service { get; }

        public Fixture()
        {
            AppointmentQueries = new AppointmentQueryService(
                AppointmentQueryRepo,
                null!,
                null!,
                StaffRoles);

            Service = new PaymentService(Payments, Confirmations, Guard, AppointmentQueries, Gateway);
        }
    }

    private static Payment NewPayment(PaymentKind kind) => new()
    {
        PaymentId = PaymentId,
        AppointmentId = AppointmentId,
        Kind = kind,
        Amount = Due,
    };

    private static CostConfirmation PendingConfirmation() => new()
    {
        ConfirmationId = Guid.NewGuid(),
        AppointmentId = AppointmentId,
        Status = ConfirmationStatus.Pending,
        ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
    };

    private static AppointmentListItem CreateItem(Guid id) => new(
        id, AppointmentType.Spa, Guid.NewGuid(), Guid.NewGuid(), "Nguyen Van A", "LuLu",
        AppointmentStatus.Pending, null, null, SizeGroup.Small, null,
        DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1), 1,
        null, null, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);

    private static AppointmentDetailData CreateAppointmentDetail(Guid appointmentId, Guid? ownerUserId) =>
        new(
            CreateItem(appointmentId),
            ownerUserId,
            [],
            [],
            null);

    private static async Task AssertErrorAsync(string code, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    // =========================================================================
    // 1. Tests cho RecordCounterAsync
    // =========================================================================

    [Fact]
    public async Task RecordCounterAsync_WhenDueAndAmountEnough_MarksPaidAndLocksBothPaymentAndAppointment()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Spa);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;

        var status = await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        Assert.Equal(PaymentStatus.Paid, status);
        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal(PaymentMethod.Cash, payment.Method);
        Assert.Equal(Due, payment.ReceivedAmount);
        Assert.Equal(Receptionist.UserId, payment.ConfirmedByUserId);

        // Khóa độc quyền cả Payment và Appointment chống race condition (TOCTOU)
        Assert.Single(fixture.Guard.LockedPaymentIds);
        Assert.Equal(PaymentId, fixture.Guard.LockedPaymentIds[0]);
        Assert.Single(fixture.Guard.LockedAppointmentIds);
        Assert.Equal(AppointmentId, fixture.Guard.LockedAppointmentIds[0]);
    }

    [Fact]
    public async Task RecordCounterAsync_WhenAppointmentStatusBecomesCancelledConcurrently_ThrowsPaymentNotDueAndLocksBoth()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.Payments.Stored = payment;
        // Trạng thái ban đầu đọc được trước khi lấy khóa Appointment là Confirmed
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;
        // Sau khi lấy khóa Appointment, trạng thái mới nhất trong DB đã bị hủy (T2 commit trước)
        fixture.Payments.LatestAppointmentStatus = AppointmentStatus.Cancelled;

        await AssertErrorAsync(ErrorCodes.PaymentNotDue,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
        Assert.Single(fixture.Guard.LockedPaymentIds);
        Assert.Equal(PaymentId, fixture.Guard.LockedPaymentIds[0]);
        Assert.Single(fixture.Guard.LockedAppointmentIds);
        Assert.Equal(AppointmentId, fixture.Guard.LockedAppointmentIds[0]);
    }

    [Fact]
    public async Task RecordCounterAsync_WhenReceivedLessThanAmount_ThrowsAmountMismatchAndStaysUnpaid()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Spa);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;

        await AssertErrorAsync(ErrorCodes.AmountMismatch,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.BankQR, Due - 1m));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
    }

    [Fact]
    public async Task RecordCounterAsync_WhenAppointmentNotDue_ThrowsPaymentNotDue()
    {
        var fixture = new Fixture();
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;

        await AssertErrorAsync(ErrorCodes.PaymentNotDue,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));
    }

    [Fact]
    public async Task RecordCounterAsync_WhenAlreadyPaid_ThrowsInvalidTransition()
    {
        var fixture = new Fixture();
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;
        await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        await AssertErrorAsync(ErrorCodes.InvalidTransition,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));
    }

    [Fact]
    public async Task RecordCounterAsync_WhenPaymentNotFound_ThrowsNotFound()
    {
        var fixture = new Fixture();

        await AssertErrorAsync(ErrorCodes.NotFound,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));
    }

    [Fact]
    public async Task RecordCounterAsync_StayWithPendingCostConfirmation_ThrowsCostConfirmationPending()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;
        fixture.Confirmations.Add(PendingConfirmation());

        await AssertErrorAsync(ErrorCodes.CostConfirmationPending,
            () => fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due));

        Assert.Equal(PaymentStatus.Unpaid, payment.Status);
    }

    [Fact]
    public async Task RecordCounterAsync_StayWithoutPendingCostConfirmation_MarksPaid()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.Payments.Stored = payment;
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;

        var status = await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        Assert.Equal(PaymentStatus.Paid, status);
    }

    [Fact]
    public async Task RecordCounterAsync_SpaIgnoresCostConfirmationCheck()
    {
        var fixture = new Fixture();
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;
        fixture.Confirmations.Add(PendingConfirmation());

        var status = await fixture.Service.RecordCounterAsync(Receptionist, PaymentId, PaymentMethod.Cash, Due);

        Assert.Equal(PaymentStatus.Paid, status);
    }

    // =========================================================================
    // 2. Tests cho ListByAppointmentAsync (Phân quyền & truy vấn)
    // =========================================================================

    [Fact]
    public async Task ListByAppointmentAsync_WhenCustomerOwnsAppointment_ReturnsPayments()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Spa);
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);
        fixture.Payments.AppointmentPayments[AppointmentId] = [payment];

        var result = await fixture.Service.ListByAppointmentAsync(CustomerOwner, AppointmentId);

        Assert.Single(result);
        Assert.Same(payment, result[0]);
    }

    [Fact]
    public async Task ListByAppointmentAsync_WhenCustomerDoesNotOwnAppointment_ThrowsForbidden()
    {
        var fixture = new Fixture();
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);

        await AssertErrorAsync(ErrorCodes.Forbidden,
            () => fixture.Service.ListByAppointmentAsync(OtherCustomer, AppointmentId));
    }

    [Fact]
    public async Task ListByAppointmentAsync_WhenReceptionist_ReturnsPayments()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);
        fixture.StaffRoles.Role = StaffRole.Receptionist;
        fixture.Payments.AppointmentPayments[AppointmentId] = [payment];

        var result = await fixture.Service.ListByAppointmentAsync(Receptionist, AppointmentId);

        Assert.Single(result);
        Assert.Same(payment, result[0]);
    }

    [Fact]
    public async Task ListByAppointmentAsync_WhenManager_ReturnsPayments()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);
        fixture.Payments.AppointmentPayments[AppointmentId] = [payment];

        var result = await fixture.Service.ListByAppointmentAsync(Manager, AppointmentId);

        Assert.Single(result);
        Assert.Same(payment, result[0]);
    }

    [Fact]
    public async Task ListByAppointmentAsync_WhenSpaStaffAssigned_ReturnsPayments()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Spa);
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);
        fixture.AppointmentQueryRepo.IsAssignedResult = true;
        fixture.StaffRoles.Role = StaffRole.SpaStaff;
        fixture.Payments.AppointmentPayments[AppointmentId] = [payment];

        var result = await fixture.Service.ListByAppointmentAsync(SpaStaff, AppointmentId);

        Assert.Single(result);
        Assert.Same(payment, result[0]);
    }

    [Fact]
    public async Task ListByAppointmentAsync_WhenSpaStaffNotAssigned_ThrowsForbidden()
    {
        var fixture = new Fixture();
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);
        fixture.AppointmentQueryRepo.IsAssignedResult = false;
        fixture.StaffRoles.Role = StaffRole.SpaStaff;

        await AssertErrorAsync(ErrorCodes.Forbidden,
            () => fixture.Service.ListByAppointmentAsync(SpaStaff, AppointmentId));
    }

    [Fact]
    public async Task ListByAppointmentAsync_WhenAppointmentNotFound_ThrowsNotFound()
    {
        var fixture = new Fixture();
        fixture.AppointmentQueryRepo.DetailResult = null;

        await AssertErrorAsync(ErrorCodes.NotFound,
            () => fixture.Service.ListByAppointmentAsync(Manager, AppointmentId));
    }

    // =========================================================================
    // 3. Tests cho ListAsync (Quản lý lọc & phân trang toàn cửa hàng)
    // =========================================================================

    [Fact]
    public async Task ListAsync_WhenCalledWithStatusFilter_PassesParametersToRepositoryAndReturnsResult()
    {
        var fixture = new Fixture();
        var payment = NewPayment(PaymentKind.Stay);
        var expectedPagedResult = new PagedResult<Payment>([payment], Page: 2, PageSize: 15, Total: 1);
        fixture.Payments.PagedResultToReturn = expectedPagedResult;

        var result = await fixture.Service.ListAsync(PaymentStatus.Unpaid, page: 2, pageSize: 15);

        Assert.Same(expectedPagedResult, result);
        Assert.Equal(PaymentStatus.Unpaid, fixture.Payments.LastStatus);
        Assert.Equal(2, fixture.Payments.LastPage);
        Assert.Equal(15, fixture.Payments.LastPageSize);
    }

    [Fact]
    public async Task ListAsync_WhenCalledWithoutStatusFilter_PassesParametersToRepositoryAndReturnsResult()
    {
        var fixture = new Fixture();
        var expectedPagedResult = new PagedResult<Payment>([], Page: 1, PageSize: 20, Total: 0);
        fixture.Payments.PagedResultToReturn = expectedPagedResult;

        var result = await fixture.Service.ListAsync(null, page: 1, pageSize: 20);

        Assert.Same(expectedPagedResult, result);
        Assert.Null(fixture.Payments.LastStatus);
        Assert.Equal(1, fixture.Payments.LastPage);
        Assert.Equal(20, fixture.Payments.LastPageSize);
    }

    private static void SetUpDueSpaPayment(Fixture fixture)
    {
        fixture.Payments.Stored = NewPayment(PaymentKind.Spa);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Completed;
        fixture.AppointmentQueryRepo.DetailResult = CreateAppointmentDetail(AppointmentId, OwnerUserId);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenOwnerAndDue_CreatesTransactionWithSystemAmountAndReturnsUrl()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);

        var result = await fixture.Service.InitiateOnlineAsync(
            CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1");

        var transaction = Assert.Single(fixture.Payments.Transactions);
        Assert.Equal(PaymentId, transaction.PaymentId);
        Assert.Equal(PaymentGateway.VNPAY, transaction.Gateway);
        Assert.Equal(Due, transaction.RequestedAmount);
        Assert.Equal(result.TxnRef, transaction.TxnRef);
        Assert.Null(transaction.Result);
        Assert.Equal($"https://pay.test/{result.TxnRef}", result.PaymentUrl);
        Assert.Equal(Due, fixture.Gateway.LastRequest!.Amount);
        Assert.Equal("127.0.0.1", fixture.Gateway.LastRequest.ClientIp);
        Assert.Equal(PaymentStatus.Unpaid, fixture.Payments.Stored!.Status);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenCalledTwice_CreatesDistinctTxnRefs()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);

        var first = await fixture.Service.InitiateOnlineAsync(
            CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1");
        var second = await fixture.Service.InitiateOnlineAsync(
            CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1");

        Assert.NotEqual(first.TxnRef, second.TxnRef);
        Assert.Equal(2, fixture.Payments.Transactions.Count);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenGatewayIsNotSupported_ThrowsValidationError()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);

        await AssertErrorAsync(ErrorCodes.ValidationError,
            () => fixture.Service.InitiateOnlineAsync(CustomerOwner, PaymentId, PaymentGateway.MoMo, "127.0.0.1"));

        Assert.Empty(fixture.Payments.Transactions);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenPaymentNotFound_ThrowsNotFound()
    {
        var fixture = new Fixture();

        await AssertErrorAsync(ErrorCodes.NotFound,
            () => fixture.Service.InitiateOnlineAsync(CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1"));
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenCustomerDoesNotOwnAppointment_ThrowsForbidden()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);

        await AssertErrorAsync(ErrorCodes.Forbidden,
            () => fixture.Service.InitiateOnlineAsync(OtherCustomer, PaymentId, PaymentGateway.VNPAY, "127.0.0.1"));

        Assert.Empty(fixture.Payments.Transactions);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenAppointmentNotCompleted_ThrowsPaymentNotDue()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);
        fixture.Payments.AppointmentStatus = AppointmentStatus.InProgress;

        await AssertErrorAsync(ErrorCodes.PaymentNotDue,
            () => fixture.Service.InitiateOnlineAsync(CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1"));

        Assert.Empty(fixture.Payments.Transactions);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenAlreadyPaid_ThrowsInvalidTransition()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);
        fixture.Payments.Stored!.MarkPaid(AppointmentStatus.Completed, PaymentMethod.Cash, Due, Receptionist.UserId);

        await AssertErrorAsync(ErrorCodes.InvalidTransition,
            () => fixture.Service.InitiateOnlineAsync(CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1"));

        Assert.Empty(fixture.Payments.Transactions);
    }

    [Fact]
    public async Task InitiateOnlineAsync_WhenPaymentIsNotSpa_ThrowsInvalidTransition()
    {
        var fixture = new Fixture();
        SetUpDueSpaPayment(fixture);
        fixture.Payments.Stored = NewPayment(PaymentKind.Stay);
        fixture.Payments.AppointmentStatus = AppointmentStatus.Confirmed;

        await AssertErrorAsync(ErrorCodes.InvalidTransition,
            () => fixture.Service.InitiateOnlineAsync(CustomerOwner, PaymentId, PaymentGateway.VNPAY, "127.0.0.1"));

        Assert.Empty(fixture.Payments.Transactions);
    }
}
