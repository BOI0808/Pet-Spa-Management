using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public class HotelAppointment : Appointment
{
    public DateTimeOffset PlannedCheckIn { get; set; }
    public DateTimeOffset PlannedCheckOut { get; set; }
    public DateTimeOffset? ActualCheckOut { get; set; }
    public Guid? CageId { get; set; }

    protected override AppointmentLifecycle GetLifecycle() => AppointmentLifecycle.Hotel;

    public override void ReturnToPending()
    {
        base.ReturnToPending();
        CageId = null;
    }

    public void AssignCage(Cage cage, Species petSpecies)
    {
        GetLifecycle().EnsureTransition(Status, AppointmentStatus.Confirmed);

        if (!cage.IsActive || cage.Species != petSpecies || cage.SizeGroup != SizeGroup)
            throw new BusinessException(ErrorCodes.CageConflict);

        CageId = cage.CageId;
        Confirm();
    }

    public void CheckIn() => MoveTo(AppointmentStatus.InStay);

    public void CheckOut(DateTimeOffset? actualCheckOut = null)
    {
        MoveTo(AppointmentStatus.Completed);
        ActualCheckOut = actualCheckOut ?? DateTimeOffset.UtcNow;
    }

    // Khách tự đổi lịch lưu trú (BR-26): cập nhật thú cưng, nhóm kích cỡ, thời điểm nhận/trả; lịch về Chờ xác nhận
    // và bỏ gán chuồng (ReturnToPending).
    public void ChangeByCustomer(
        Guid petId, SizeGroup sizeGroup, DateTimeOffset plannedCheckIn, DateTimeOffset plannedCheckOut)
    {
        MarkChangedByCustomer();

        PetId = petId;
        SizeGroup = sizeGroup;
        PlannedCheckIn = plannedCheckIn;
        PlannedCheckOut = plannedCheckOut;
    }
}
