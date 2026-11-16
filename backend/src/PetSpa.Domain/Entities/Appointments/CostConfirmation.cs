using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Domain.Entities;

public class CostConfirmation
{
    public Guid ConfirmationId { get; set; }
    public Guid AppointmentId { get; set; }
    public decimal ActualWeightKg { get; set; }
    public SizeGroup NewSizeGroup { get; set; }
    public decimal OldAmount { get; set; }
    public decimal NewAmount { get; set; }
    public ConfirmationStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
    public Guid? RespondedByUserId { get; set; }

    public void Accept(Guid respondedByUserId) =>
        Respond(ConfirmationStatus.Accepted, respondedByUserId);

    public void Reject(Guid respondedByUserId) =>
        Respond(ConfirmationStatus.Rejected, respondedByUserId);

    public void Expire()
    {
        if (Status != ConfirmationStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        Status = ConfirmationStatus.Expired;
        RespondedAt = DateTimeOffset.UtcNow;
    }

    private void Respond(ConfirmationStatus status, Guid respondedByUserId)
    {
        if (Status != ConfirmationStatus.Pending)
            throw new BusinessException(ErrorCodes.InvalidTransition);

        Status = status;
        RespondedAt = DateTimeOffset.UtcNow;
        RespondedByUserId = respondedByUserId;
    }
}