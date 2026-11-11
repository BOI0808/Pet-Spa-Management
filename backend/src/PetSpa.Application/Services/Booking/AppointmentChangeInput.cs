namespace PetSpa.Application.Services.Booking;

// Nội dung khách gửi khi đổi lịch. Spa dùng SlotStart, PetId, ServiceIds; lưu trú dùng PlannedCheckIn, PlannedCheckOut, PetId.
// Trường không thuộc loại lịch hẹn bị bỏ qua.
public sealed record AppointmentChangeInput(
    Guid? PetId,
    IReadOnlyList<Guid>? ServiceIds,
    DateTimeOffset? SlotStart,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut);
