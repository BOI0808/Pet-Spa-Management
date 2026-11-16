using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class CostConfirmationTests
{
    private static CostConfirmation Confirmation(ConfirmationStatus status = ConfirmationStatus.Pending) => new()
    {
        ConfirmationId = Guid.NewGuid(),
        AppointmentId = Guid.NewGuid(),
        ActualWeightKg = 3.4m,
        NewSizeGroup = SizeGroup.Medium,
        OldAmount = 100000m,
        NewAmount = 150000m,
        Status = status,
        ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
    };

    [Fact]
    public void Accept_WhenPending_SetsAcceptedAndResponder()
    {
        var confirmation = Confirmation();
        var userId = Guid.NewGuid();

        confirmation.Accept(userId);

        Assert.Equal(ConfirmationStatus.Accepted, confirmation.Status);
        Assert.Equal(userId, confirmation.RespondedByUserId);
        Assert.NotNull(confirmation.RespondedAt);
    }

    [Fact]
    public void Reject_WhenPending_SetsRejectedAndResponder()
    {
        var confirmation = Confirmation();
        var userId = Guid.NewGuid();

        confirmation.Reject(userId);

        Assert.Equal(ConfirmationStatus.Rejected, confirmation.Status);
        Assert.Equal(userId, confirmation.RespondedByUserId);
        Assert.NotNull(confirmation.RespondedAt);
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void Accept_WhenNotPending_ThrowsInvalidTransition(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        var ex = Assert.Throws<BusinessException>(() => confirmation.Accept(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, confirmation.Status);
        Assert.Null(confirmation.RespondedAt);
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void Reject_WhenNotPending_ThrowsInvalidTransition(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        var ex = Assert.Throws<BusinessException>(() => confirmation.Reject(Guid.NewGuid()));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, confirmation.Status);
    }

    [Fact]
    public void Expire_WhenPending_SetsExpired()
    {
        var confirmation = Confirmation();

        confirmation.Expire();

        Assert.Equal(ConfirmationStatus.Expired, confirmation.Status);
        Assert.NotNull(confirmation.RespondedAt);
    }

    [Theory]
    [InlineData(ConfirmationStatus.Accepted)]
    [InlineData(ConfirmationStatus.Rejected)]
    [InlineData(ConfirmationStatus.Expired)]
    public void Expire_WhenNotPending_ThrowsInvalidTransition(ConfirmationStatus status)
    {
        var confirmation = Confirmation(status);

        var ex = Assert.Throws<BusinessException>(() => confirmation.Expire());

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, confirmation.Status);
    }
}