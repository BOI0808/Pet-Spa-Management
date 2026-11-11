using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentCustomerChangeTests
{
    private static readonly DateTimeOffset Start = new(2026, 12, 1, 3, 0, 0, TimeSpan.Zero);

    private static void AssertInvalidTransition(Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void EnsureCustomerCanChange_PendingOrConfirmed_Succeeds(AppointmentStatus status)
    {
        var appointment = new SpaAppointment { Status = status };

        appointment.EnsureCustomerCanChange();
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureCustomerCanChange_SpaOtherStatus_IsRejected(AppointmentStatus status)
    {
        var appointment = new SpaAppointment { Status = status };

        AssertInvalidTransition(appointment.EnsureCustomerCanChange);
    }

    [Theory]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureCustomerCanChange_HotelOtherStatus_IsRejected(AppointmentStatus status)
    {
        var appointment = new HotelAppointment { Status = status };

        AssertInvalidTransition(appointment.EnsureCustomerCanChange);
    }

    [Fact]
    public void Spa_ChangeByCustomer_FromConfirmed_ReturnsToPendingAndUpdatesWindow()
    {
        var petId = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            Status = AppointmentStatus.Confirmed,
            SizeGroup = SizeGroup.Small,
            StaffRequired = 1,
        };

        appointment.ChangeByCustomer(
            petId, SizeGroup.Medium, Start, Start.AddMinutes(90), Start.AddMinutes(105), 2);

        Assert.Equal(AppointmentStatus.Pending, appointment.Status);
        Assert.Equal(petId, appointment.PetId);
        Assert.Equal(SizeGroup.Medium, appointment.SizeGroup);
        Assert.Equal(Start, appointment.SlotStart);
        Assert.Equal(Start.AddMinutes(90), appointment.SlotEnd);
        Assert.Equal(Start.AddMinutes(105), appointment.BusyUntil);
        Assert.Equal((short)2, appointment.StaffRequired);
    }

    [Fact]
    public void Spa_ChangeByCustomer_FromPending_StaysPending()
    {
        var appointment = new SpaAppointment { Status = AppointmentStatus.Pending };

        appointment.ChangeByCustomer(
            Guid.NewGuid(), SizeGroup.Small, Start, Start.AddMinutes(60), Start.AddMinutes(75), 1);

        Assert.Equal(AppointmentStatus.Pending, appointment.Status);
        Assert.Equal(Start, appointment.SlotStart);
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void Spa_ChangeByCustomer_FromOtherStatus_IsRejectedAndKeepsData(AppointmentStatus status)
    {
        var oldStart = Start.AddDays(-1);
        var appointment = new SpaAppointment { Status = status, SlotStart = oldStart };

        AssertInvalidTransition(() => appointment.ChangeByCustomer(
            Guid.NewGuid(), SizeGroup.Small, Start, Start.AddMinutes(60), Start.AddMinutes(75), 1));

        Assert.Equal(status, appointment.Status);
        Assert.Equal(oldStart, appointment.SlotStart);
    }

    [Fact]
    public void Hotel_ChangeByCustomer_FromConfirmed_ReturnsToPendingAndClearsCage()
    {
        var petId = Guid.NewGuid();
        var appointment = new HotelAppointment
        {
            Status = AppointmentStatus.Confirmed,
            SizeGroup = SizeGroup.Small,
            CageId = Guid.NewGuid(),
        };

        appointment.ChangeByCustomer(petId, SizeGroup.Large, Start, Start.AddDays(2));

        Assert.Equal(AppointmentStatus.Pending, appointment.Status);
        Assert.Null(appointment.CageId);
        Assert.Equal(petId, appointment.PetId);
        Assert.Equal(SizeGroup.Large, appointment.SizeGroup);
        Assert.Equal(Start, appointment.PlannedCheckIn);
        Assert.Equal(Start.AddDays(2), appointment.PlannedCheckOut);
    }

    [Fact]
    public void Hotel_ChangeByCustomer_FromInStay_IsRejectedAndKeepsCage()
    {
        var cageId = Guid.NewGuid();
        var appointment = new HotelAppointment { Status = AppointmentStatus.InStay, CageId = cageId };

        AssertInvalidTransition(() => appointment.ChangeByCustomer(
            Guid.NewGuid(), SizeGroup.Small, Start, Start.AddDays(1)));

        Assert.Equal(AppointmentStatus.InStay, appointment.Status);
        Assert.Equal(cageId, appointment.CageId);
    }
}
