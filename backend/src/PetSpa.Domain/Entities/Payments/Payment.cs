using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.Entities;

public class Payment
{
    public Guid PaymentId { get; set; }
    public Guid AppointmentId { get; set; }
    public PaymentKind Kind { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; private set; } = PaymentStatus.Unpaid;
    public PaymentMethod? Method { get; private set; }
    public decimal? ReceivedAmount { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }
    public Guid? ConfirmedByUserId { get; private set; }

    public void MarkPaid(
        AppointmentStatus appointmentStatus,
        PaymentMethod method,
        decimal receivedAmount,
        Guid? confirmedByUserId)
    {
        if (Status != PaymentStatus.Unpaid)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        if (!IsDue(appointmentStatus))
            throw new BusinessException(ErrorCodes.PaymentNotDue);

        if (!IsAmountEnough(method, receivedAmount))
            throw new BusinessException(ErrorCodes.AmountMismatch);

        Status = PaymentStatus.Paid;
        Method = method;
        ReceivedAmount = receivedAmount;
        PaidAt = DateTimeOffset.UtcNow;
        ConfirmedByUserId = confirmedByUserId;
    }

    private bool IsDue(AppointmentStatus appointmentStatus) => Kind switch
    {
        PaymentKind.Spa => appointmentStatus == AppointmentStatus.Completed,
        PaymentKind.Stay => appointmentStatus == AppointmentStatus.Confirmed,
        PaymentKind.LateFee => appointmentStatus == AppointmentStatus.InStay,
        _ => false,
    };

    private bool IsAmountEnough(PaymentMethod method, decimal receivedAmount) =>
        method == PaymentMethod.Online ? receivedAmount == Amount : receivedAmount >= Amount;
}
