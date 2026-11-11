using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public class SpaAppointment : Appointment
{
    public DateTimeOffset SlotStart { get; set; }
    public DateTimeOffset SlotEnd { get; set; }
    public DateTimeOffset BusyUntil { get; set; }
    public short StaffRequired { get; set; }

    protected override AppointmentLifecycle GetLifecycle() => AppointmentLifecycle.Spa;

    // Gán đủ nhân viên và xác nhận lịch (Chờ xác nhận → Đã xác nhận).
    // Trả các dòng giữ chỗ nhân viên (BusyFrom/BusyUntil sao chép từ lịch) để Application lưu cùng giao dịch.
    public IReadOnlyList<AppointmentStaff> AssignStaff(IReadOnlyCollection<Guid> staffIds)
    {
        GetLifecycle().EnsureTransition(Status, AppointmentStatus.Confirmed);

        var distinctIds = staffIds.Distinct().ToList();
        if (distinctIds.Count != StaffRequired)
            throw new BusinessException(ErrorCodes.StaffCountMismatch);

        var assignedAt = DateTimeOffset.UtcNow;
        var assignments = distinctIds
            .Select(staffId => new AppointmentStaff
            {
                AppointmentId = AppointmentId,
                StaffId = staffId,
                BusyFrom = SlotStart,
                BusyUntil = BusyUntil,
                IsHolding = true,
                AssignedAt = assignedAt,
            })
            .ToList();

        Confirm();

        return assignments;
    }

    public void Receive() => MoveTo(AppointmentStatus.Received);

    public void Start() => MoveTo(AppointmentStatus.InProgress);

    public void Complete() => MoveTo(AppointmentStatus.Completed);

    // Khách tự đổi lịch spa (BR-26): cập nhật thú cưng, nhóm kích cỡ và khoảng giữ chỗ mới, lịch về Chờ xác nhận.
    public void ChangeByCustomer(
        Guid petId, SizeGroup sizeGroup, DateTimeOffset slotStart, DateTimeOffset slotEnd,
        DateTimeOffset busyUntil, short staffRequired)
    {
        MarkChangedByCustomer();

        PetId = petId;
        SizeGroup = sizeGroup;
        SlotStart = slotStart;
        SlotEnd = slotEnd;
        BusyUntil = busyUntil;
        StaffRequired = staffRequired;
    }
}
