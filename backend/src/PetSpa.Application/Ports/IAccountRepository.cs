using PetSpa.Domain.Enums;
using PetSpa.Application.Common;
namespace PetSpa.Application.Ports;

// Hồ sơ của chính người gọi. StaffRole chỉ có khi Role = Staff; Phone chỉ có với khách hàng.
public sealed record MeProfile(
    Guid UserId, string UserName, UserRole Role, StaffRole? StaffRole,
    string? FullName, string? Phone, string? Email);

public sealed record CustomerSummary(Guid CustomerId, string FullName, string Phone, string? Email, bool IsBookingLocked);

public interface IAccountRepository
{
    // Tạo AppUser (Role = Customer) và Customer trong một giao dịch.
    // Trùng số điện thoại -> DUPLICATE_CONTACT; mật khẩu không đạt -> VALIDATION_ERROR.
    Task<Guid> CreateCustomerAccountAsync(
        string phone, string fullName, string? email, string password, CancellationToken ct = default);
        Task<MeProfile?> GetMeAsync(Guid userId, CancellationToken ct = default);

    // Cập nhật Customer; nếu đổi số thì cập nhật cả AppUser.UserName trong cùng giao dịch (X-02).
    // phone = null: giữ nguyên số. email = null: xóa email.
    Task UpdateCustomerProfileAsync(
        Guid userId, string fullName, string? phone, string? email, CancellationToken ct = default);

    Task UpdateStaffFullNameAsync(Guid userId, string fullName, CancellationToken ct = default);
        // Customer.UserId = NULL, không tạo AppUser. Trùng số điện thoại -> DUPLICATE_CONTACT.
    Task<Guid> CreateWalkInAsync(string fullName, string phone, CancellationToken ct = default);

    // phone = null: lấy tất cả. Tìm theo số điện thoại chứa chuỗi tìm.
    // lockedOnly = true: chỉ khách đang bị khóa quyền tự đặt lịch (quản lý xem để gỡ khóa, FR-BOOK-07).
    Task<PagedResult<CustomerSummary>> SearchCustomersAsync(
        string? phone, bool lockedOnly, int page, int pageSize, CancellationToken ct = default);

    // Trạng thái khóa tự đặt lịch của khách (Customer.IsBookingLocked); null nếu không có khách hàng.
    Task<bool?> GetBookingLockStateAsync(Guid customerId, CancellationToken ct = default);

    // Đặt Customer.IsBookingLocked = false (FR-BOOK-07).
    Task UnlockBookingAsync(Guid customerId, CancellationToken ct = default);
}