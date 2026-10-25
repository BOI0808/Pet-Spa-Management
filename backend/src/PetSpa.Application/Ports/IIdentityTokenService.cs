namespace PetSpa.Application.Ports;

public sealed record TokenPair(string AccessToken, string RefreshToken);

public interface IIdentityTokenService
{
    // Kiểm tra tên đăng nhập và mật khẩu. Trả UserId nếu hợp lệ;
    Task<Guid?> ValidateCredentialsAsync(string userName, string password);

    Task<TokenPair> IssueTokensAsync(Guid userId, CancellationToken ct = default);

    Task<TokenPair?> RotateAsync(string refreshToken, CancellationToken ct = default);

    Task RevokeAsync(string refreshToken, CancellationToken ct = default);

    Task RevokeAllAsync(Guid userId, CancellationToken ct = default);

    Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default);
}