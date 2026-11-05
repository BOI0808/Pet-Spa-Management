using PetSpa.Application.Services.Booking;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

// Body của POST /api/v1/appointments/spa.
// Không có nhân viên, tiền, nhóm kích cỡ, trạng thái: backend tự quyết định, trường thừa bị bỏ qua.
// customerId: bắt buộc với lễ tân đặt thay; khách hàng tự đặt thì bỏ qua.
public sealed record SpaBookingRequest(
    Guid? PetId,
    List<Guid>? ServiceIds,
    DateTimeOffset? SlotStart,
    Guid? CustomerId);

public sealed record SpaBookingResponse(
    Guid AppointmentId,
    string Type,
    AppointmentStatus Status,
    SizeGroup SizeGroup,
    DateTimeOffset SlotStart,
    DateTimeOffset SlotEnd,
    int StaffRequired,
    long EstimatedAmount)
{
    public static SpaBookingResponse From(SpaBookingResult result) => new(
        result.AppointmentId, "Spa", result.Status, result.SizeGroup, result.SlotStart, result.SlotEnd,
        result.StaffRequired, (long)result.EstimatedAmount);
}
