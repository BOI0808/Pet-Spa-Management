using Microsoft.Extensions.DependencyInjection;
using PetSpa.Application.Services.Auth;
using PetSpa.Application.Services.Pets;
namespace PetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Các module đăng ký service của mình ở đây
        services.AddScoped<PetService>();
        services.AddScoped<AccountService>();
        services.AddScoped<AuthService>();
        return services;
    }
}