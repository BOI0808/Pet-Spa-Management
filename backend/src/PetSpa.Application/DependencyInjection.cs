using Microsoft.Extensions.DependencyInjection;
namespace PetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Các module đăng ký service của mình ở đây
        return services;
    }
}