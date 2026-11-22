using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PetSpa.Application.Services.Assignment;

namespace PetSpa.Infrastructure.BackgroundJobs;

// Quét tác vụ tự động mỗi 1 phút. Chỉ gọi Application Service, không chứa logic nghiệp vụ.
// Chạy một lần ngay khi backend khởi động để xử lý bù các lịch quá hạn trong lúc backend dừng hoặc đang ngủ.
public sealed class AutoCancelBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<AutoCancelBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        try
        {
            do
            {
                await RunOnceAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Backend đang dừng: thoát bình thường.
        }
    }

    // Mỗi lần quét dùng một scope riêng (AppDbContext là scoped). Lỗi một lần quét không làm dừng các lần sau.
    private async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var service = scope.ServiceProvider.GetRequiredService<AutoCancelService>();

            var processed = await service.RunAsync(ct);
            if (processed > 0)
                logger.LogInformation("Tác vụ tự động đã hủy {Count} lịch hẹn.", processed);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Tác vụ tự động gặp lỗi, sẽ thử lại ở lần quét sau.");
        }
    }
}
