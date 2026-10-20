using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace PetSpa.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // Khôi (task 53): DbContext + Identity
        // Vương (task 57): JWT Bearer
        return services;
    }
}