using Microsoft.Extensions.Configuration;
using PetSpa.Application.Ports;

namespace PetSpa.Infrastructure.Services;

public sealed class StoreTimeZoneProvider(IConfiguration configuration) : IStoreTimeZoneProvider
{
    private readonly Lazy<TimeZoneInfo> _timeZone = new(() =>
    {
        var id = configuration["App:TimeZone"]
            ?? throw new InvalidOperationException("Thiếu cấu hình App__TimeZone.");

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new InvalidOperationException($"Không tìm thấy múi giờ {id} khai báo ở App__TimeZone.");
        }
    });

    public TimeZoneInfo GetStoreTimeZone() => _timeZone.Value;
}

