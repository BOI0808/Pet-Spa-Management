using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Dtos;

// Body của PUT /api/v1/appointments/{id} (khách đổi lịch).
// Spa: slotStart, petId, serviceIds. Lưu trú: plannedCheckIn, plannedCheckOut, petId.
// Không có status, amount, sizeGroup; staffIds, cageId (việc của quản lý – ID 76) và trường thừa bị bỏ qua.
public sealed record UpdateAppointmentRequest(
    DateTimeOffset? SlotStart = null,
    DateTimeOffset? PlannedCheckIn = null,
    DateTimeOffset? PlannedCheckOut = null,
    Guid? PetId = null,
    IReadOnlyList<Guid>? ServiceIds = null)
{
    public AppointmentChangeInput ToInput() => new(PetId, ServiceIds, SlotStart, PlannedCheckIn, PlannedCheckOut);
}
