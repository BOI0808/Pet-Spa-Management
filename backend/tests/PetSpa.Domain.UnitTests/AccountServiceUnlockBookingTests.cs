using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Application.Services.Auth;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AccountServiceUnlockBookingTests
{
    private static readonly Guid CustomerId = Guid.NewGuid();

    private sealed class FakeAccountRepository : IAccountRepository
    {
        // null = không có khách hàng.
        public bool? LockState { get; set; }
        public List<Guid> Unlocked { get; } = [];
        public bool? LastLockedOnly { get; private set; }

        public Task<bool?> GetBookingLockStateAsync(Guid customerId, CancellationToken ct = default) =>
            Task.FromResult(LockState);

        public Task UnlockBookingAsync(Guid customerId, CancellationToken ct = default)
        {
            Unlocked.Add(customerId);
            return Task.CompletedTask;
        }

        public Task<PagedResult<CustomerSummary>> SearchCustomersAsync(
            string? phone, bool lockedOnly, int page, int pageSize, CancellationToken ct = default)
        {
            LastLockedOnly = lockedOnly;
            return Task.FromResult(new PagedResult<CustomerSummary>([], page, pageSize, 0));
        }

        public Task<Guid> CreateCustomerAccountAsync(
            string phone, string fullName, string? email, string password, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<MeProfile?> GetMeAsync(Guid userId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task UpdateCustomerProfileAsync(
            Guid userId, string fullName, string? phone, string? email, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task UpdateStaffFullNameAsync(Guid userId, string fullName, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Guid> CreateWalkInAsync(string fullName, string phone, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    [Fact]
    public async Task UnlockBookingAsync_LockedCustomer_Unlocks()
    {
        var accounts = new FakeAccountRepository { LockState = true };
        var service = new AccountService(accounts);

        await service.UnlockBookingAsync(CustomerId);

        Assert.Equal(CustomerId, Assert.Single(accounts.Unlocked));
    }

    [Fact]
    public async Task UnlockBookingAsync_CustomerNotLocked_ThrowsCustomerNotLocked()
    {
        var accounts = new FakeAccountRepository { LockState = false };
        var service = new AccountService(accounts);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UnlockBookingAsync(CustomerId));

        Assert.Equal(ErrorCodes.CustomerNotLocked, ex.Code);
        Assert.Empty(accounts.Unlocked);
    }

    [Fact]
    public async Task UnlockBookingAsync_CustomerNotFound_ThrowsNotFound()
    {
        var accounts = new FakeAccountRepository { LockState = null };
        var service = new AccountService(accounts);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UnlockBookingAsync(CustomerId));

        Assert.Equal(ErrorCodes.NotFound, ex.Code);
        Assert.Empty(accounts.Unlocked);
    }

    [Fact]
    public async Task SearchCustomersAsync_Manager_OnlyLockedCustomers()
    {
        var accounts = new FakeAccountRepository();
        var service = new AccountService(accounts);

        await service.SearchCustomersAsync(new CurrentUser(Guid.NewGuid(), UserRole.Manager), null, 1, 20);

        Assert.True(accounts.LastLockedOnly);
    }

    [Fact]
    public async Task SearchCustomersAsync_Receptionist_AllCustomers()
    {
        var accounts = new FakeAccountRepository();
        var service = new AccountService(accounts);

        await service.SearchCustomersAsync(new CurrentUser(Guid.NewGuid(), UserRole.Staff), "0900", 1, 20);

        Assert.False(accounts.LastLockedOnly);
    }
}
