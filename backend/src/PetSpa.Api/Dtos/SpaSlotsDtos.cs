using System.Globalization;
using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// Tham số truy vấn cho GET /api/v1/spa/slots?date=&petId=&serviceIds=
// serviceIds: các mã dịch vụ ngăn cách bằng dấu phẩy
public sealed class SpaSlotsQuery
{
    public DateOnly? Date { get; init; }
    public Guid? PetId { get; init; }
    public string? ServiceIds { get; init; }

    // Trả false nếu rỗng hoặc có mã không phải GUID.
    public static bool TryParseServiceIds(string? raw, out List<Guid> ids)
    {
        ids = [];
        if (string.IsNullOrWhiteSpace(raw)) return false;

        foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!Guid.TryParse(part, out var id)) return false;
            ids.Add(id);
        }

        return ids.Count > 0;
    }
}

public sealed record SpaSlotResponse(string Time, SlotGroup Group, SlotStatus Status);

public sealed record SpaSlotsResponse(
    int DurationMinutes, int StaffRequired, int BufferMinutes, IReadOnlyList<SpaSlotResponse> Slots)
{
    public static SpaSlotsResponse From(SpaSlotsResult result) => new(
        result.DurationMinutes,
        result.StaffRequired,
        result.BufferMinutes,
        result.Slots
            .Select(s => new SpaSlotResponse(s.Time.ToString("HH:mm", CultureInfo.InvariantCulture), s.Group, s.Status))
            .ToList());
}

