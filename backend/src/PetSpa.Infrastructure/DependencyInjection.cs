using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Infrastructure.Identity;
using PetSpa.Infrastructure.Persistence;
using PetSpa.Infrastructure.Persistence.Repositories;
using PetSpa.Infrastructure.Services;

namespace PetSpa.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Thiếu biến môi trường ConnectionStrings__Default.");

        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString));

        services.AddIdentityCore<AppUser>()
            .AddEntityFrameworkStores<AppDbContext>();

        var jwt = config.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        if (Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
            throw new InvalidOperationException("Thiếu hoặc quá ngắn biến môi trường Jwt__SigningKey (tối thiểu 32 ký tự).");
        if (jwt.AccessTokenMinutes <= 0 || jwt.RefreshTokenDays <= 0)
            throw new InvalidOperationException("Jwt__AccessTokenMinutes và Jwt__RefreshTokenDays phải lớn hơn 0.");
        services.AddSingleton(jwt);

        var timeZoneId = config["App:TimeZone"]
            ?? throw new InvalidOperationException("Thiếu cấu hình App__TimeZone.");
        try
        {
            services.AddSingleton(new ShopTimeZone(TimeZoneInfo.FindSystemTimeZoneById(timeZoneId)));
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            throw new InvalidOperationException($"App__TimeZone không hợp lệ: {timeZoneId}.", ex);
        }

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Giữ nguyên tên claim "sub", "role" như trong token (không đổi sang tên dài của Microsoft).
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
                    ValidateIssuer = false,    // chỉ một backend vừa phát hành vừa kiểm tra token
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, // hết hạn đúng thời điểm, không cộng thêm 5 phút
                    NameClaimType = TokenClaims.UserId,
                    RoleClaimType = TokenClaims.Role,
                };
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var identity = context.HttpContext.RequestServices.GetRequiredService<IIdentityTokenService>();
                        var userIdText = context.Principal?.FindFirst(TokenClaims.UserId)?.Value;

                        if (!Guid.TryParse(userIdText, out var userId)
                            || !await identity.IsActiveAsync(userId, context.HttpContext.RequestAborted))
                        {
                            context.Fail("Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.");
                        }
                    },
                };
            });
        services.AddScoped<IIdentityTokenService, IdentityTokenService>();
        services.AddScoped<IStaffRoleReader, StaffRoleReader>();
        services.AddScoped<IServiceCatalogRepository, ServiceCatalogRepository>();
        services.AddScoped<IHotelCatalogRepository, HotelCatalogRepository>();
        services.AddScoped<IPetRepository, PetRepository>();
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IStaffRepository, StaffRepository>();
        services.AddScoped<IWorkShiftRepository, WorkShiftRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IAssignmentRepository, AssignmentRepository>();
        services.AddScoped<IPaymentAmountRepository, PaymentAmountRepository>();
        services.AddScoped<IHotelBookingRepository, HotelBookingRepository>();
        services.AddScoped<IHotelAssignmentRepository, HotelAssignmentRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddSingleton<IStoreTimeZoneProvider, StoreTimeZoneProvider>();
        services.AddScoped<IConcurrencyGuard, PostgresConcurrencyGuard>();
        return services;
    }
}
