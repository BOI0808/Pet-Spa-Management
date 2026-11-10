using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentRejectTests
{
    [Fact]
    public void Reject_WhenPending_CancelsWithStoreUnable()
    {
        var stay = new HotelAppointment();

        stay.Reject();

        Assert.Equal(AppointmentStatus.Cancelled, stay.Status);
        Assert.Equal(CancelReason.StoreUnable, stay.CancelReason);
        Assert.NotNull(stay.CancelledAt);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Reject_WhenNotPending_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var stay = new HotelAppointment { Status = status };

        var ex = Assert.Throws<BusinessException>(() => stay.Reject());

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, stay.Status);
    }

    [Fact]
    public void Reject_SpaWhenPending_CancelsWithStoreUnable()
    {
        var spa = new SpaAppointment();

        spa.Reject();

        Assert.Equal(AppointmentStatus.Cancelled, spa.Status);
        Assert.Equal(CancelReason.StoreUnable, spa.CancelReason);
        Assert.NotNull(spa.CancelledAt);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Reject_SpaWhenNotPending_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var spa = new SpaAppointment { Status = status };

        var ex = Assert.Throws<BusinessException>(() => spa.Reject());

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, spa.Status);
    }
}