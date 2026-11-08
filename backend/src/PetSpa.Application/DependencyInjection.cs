using Microsoft.Extensions.DependencyInjection;
using PetSpa.Application.Services.Auth;
using PetSpa.Application.Services.Pets;
using PetSpa.Application.Services;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.StaffManagement;
using PetSpa.Application.Services.Payments;
using PetSpa.Application.Services.Notifications;
using PetSpa.Application.Services.Assignment;

namespace PetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Các module đăng ký service của mình ở đây
        services.AddScoped<PetService>();
        services.AddScoped<ServiceCatalogService>();
        services.AddScoped<HotelCatalogService>();
        services.AddScoped<AccountService>();
        services.AddScoped<AuthService>();
        services.AddScoped<StaffService>();
        services.AddScoped<WorkShiftService>();
        services.AddScoped<BookingService>();
        services.AddScoped<PaymentAmountService>();
        services.AddScoped<HotelBookingService>();
        services.AddScoped<HotelAssignmentService>();
        services.AddScoped<NotificationService>();
        return services;
    }
}