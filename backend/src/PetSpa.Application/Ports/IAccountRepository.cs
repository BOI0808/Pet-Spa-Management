namespace PetSpa.Application.Ports;

public interface IAccountRepository
{
    // Tạo AppUser (Role = Customer) và Customer trong một giao dịch.
    // Trùng số điện thoại -> DUPLICATE_CONTACT; mật khẩu không đạt -> VALIDATION_ERROR.
    Task<Guid> CreateCustomerAccountAsync(
        string phone, string fullName, string? email, string password, CancellationToken ct = default);
}