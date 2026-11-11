using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.StateMachine;

namespace PetSpa.Domain.Entities;

public abstract class Appointment
{
    public Guid AppointmentId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid PetId { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public CancelReason? CancelReason { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public SizeGroup SizeGroup { get; set; }
    public decimal? ActualWeightKg { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    protected abstract AppointmentLifecycle GetLifecycle();

    public void Confirm() => MoveTo(AppointmentStatus.Confirmed);

    public virtual void ReturnToPending() => MoveTo(AppointmentStatus.Pending);

    // Khách tự đổi hoặc hủy chỉ áp dụng cho lịch Chờ xác nhận hoặc Đã xác nhận (BR-08, BR-14).
    public void EnsureCustomerCanChange()
    {
        if (Status is not (AppointmentStatus.Pending or AppointmentStatus.Confirmed))
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }

    // Khách tự đổi lịch (BR-26): lịch Đã xác nhận quay về Chờ xác nhận để quản lý duyệt lại;
    // lịch đang Chờ xác nhận giữ nguyên trạng thái.
    protected void MarkChangedByCustomer()
    {
        EnsureCustomerCanChange();

        if (Status == AppointmentStatus.Confirmed)
            ReturnToPending();
        else
            UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Reject()
    {
        if (Status != AppointmentStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        Cancel(Enums.CancelReason.StoreUnable);
    }

    public void Cancel(CancelReason reason)
    {
        GetLifecycle().EnsureCancel(Status, reason);

        var now = DateTimeOffset.UtcNow;
        Status = AppointmentStatus.Cancelled;
        CancelReason = reason;
        CancelledAt = now;
        UpdatedAt = now;
    }

    protected void MoveTo(AppointmentStatus next)
    {
        GetLifecycle().EnsureTransition(Status, next);

        Status = next;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
