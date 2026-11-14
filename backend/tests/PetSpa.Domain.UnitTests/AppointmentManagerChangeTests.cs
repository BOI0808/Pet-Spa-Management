using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentManagerChangeTests
{
    private static readonly DateTimeOffset Start = new(2026, 12, 1, 3, 0, 0, TimeSpan.Zero);

    private static void AssertError(string code, Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(code, ex.Code);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void EnsureManagerCanChange_PendingOrConfirmed_Succeeds(AppointmentStatus status)
    {
        var appointment = new SpaAppointment { Status = status };

        appointment.EnsureManagerCanChange();
    }

    [Theory]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureManagerCanChange_SpaOtherStatus_IsRejected(AppointmentStatus status)
    {
        var appointment = new SpaAppointment { Status = status };

        AssertError(ErrorCodes.InvalidTransition, appointment.EnsureManagerCanChange);
    }

    [Theory]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void EnsureManagerCanChange_HotelOtherStatus_IsRejected(AppointmentStatus status)
    {
        var appointment = new HotelAppointment { Status = status };

        AssertError(ErrorCodes.InvalidTransition, appointment.EnsureManagerCanChange);
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void Spa_ChangeByManager_KeepsStatusAndUpdatesWindow(AppointmentStatus status)
    {
        var petId = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            Status = status,
            SizeGroup = SizeGroup.Small,
            StaffRequired = 1,
        };

        appointment.ChangeByManager(petId, SizeGroup.Medium, Start, Start.AddMinutes(60), Start.AddMinutes(75), 2);

        Assert.Equal(status, appointment.Status);
        Assert.Equal(petId, appointment.PetId);
        Assert.Equal(SizeGroup.Medium, appointment.SizeGroup);
        Assert.Equal(Start, appointment.SlotStart);
        Assert.Equal(Start.AddMinutes(60), appointment.SlotEnd);
        Assert.Equal(Start.AddMinutes(75), appointment.BusyUntil);
        Assert.Equal((short)2, appointment.StaffRequired);
    }

    [Fact]
    public void Spa_ChangeByManager_Received_ThrowsAndKeepsData()
    {
        var appointment = new SpaAppointment
        {
            Status = AppointmentStatus.Received,
            SlotStart = Start,
            StaffRequired = 1,
        };

        AssertError(
            ErrorCodes.InvalidTransition,
            () => appointment.ChangeByManager(Guid.NewGuid(), SizeGroup.Small, Start.AddDays(1), Start.AddDays(1), Start.AddDays(1), 2));

        Assert.Equal(Start, appointment.SlotStart);
        Assert.Equal((short)1, appointment.StaffRequired);
    }

    [Fact]
    public void Spa_ReplaceStaff_Confirmed_BuildsHoldingRowsForCurrentWindow()
    {
        var staffA = Guid.NewGuid();
        var staffB = Guid.NewGuid();
        var appointment = new SpaAppointment
        {
            AppointmentId = Guid.NewGuid(),
            Status = AppointmentStatus.Confirmed,
            SlotStart = Start,
            BusyUntil = Start.AddMinutes(75),
            StaffRequired = 2,
        };

        var rows = appointment.ReplaceStaff([staffA, staffB, staffA]);

        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        Assert.Equal(2, rows.Count);
        Assert.All(rows, r =>
        {
            Assert.Equal(appointment.AppointmentId, r.AppointmentId);
            Assert.Equal(Start, r.BusyFrom);
            Assert.Equal(Start.AddMinutes(75), r.BusyUntil);
            Assert.True(r.IsHolding);
        });
        Assert.Contains(rows, r => r.StaffId == staffA);
        Assert.Contains(rows, r => r.StaffId == staffB);
    }

    [Fact]
    public void Spa_ReplaceStaff_WrongCount_ThrowsStaffCountMismatch()
    {
        var appointment = new SpaAppointment { Status = AppointmentStatus.Confirmed, StaffRequired = 2 };

        AssertError(ErrorCodes.StaffCountMismatch, () => appointment.ReplaceStaff([Guid.NewGuid()]));
    }

    [Fact]
    public void Spa_ReplaceStaff_Pending_ThrowsInvalidTransition()
    {
        var appointment = new SpaAppointment { Status = AppointmentStatus.Pending, StaffRequired = 1 };

        AssertError(ErrorCodes.InvalidTransition, () => appointment.ReplaceStaff([Guid.NewGuid()]));
    }

    [Theory]
    [InlineData(AppointmentStatus.Pending)]
    [InlineData(AppointmentStatus.Confirmed)]
    public void Hotel_ChangeByManager_KeepsStatusAndCage(AppointmentStatus status)
    {
        var petId = Guid.NewGuid();
        var cageId = Guid.NewGuid();
        var appointment = new HotelAppointment
        {
            Status = status,
            SizeGroup = SizeGroup.Small,
            CageId = cageId,
        };

        appointment.ChangeByManager(petId, SizeGroup.Large, Start, Start.AddDays(2));

        Assert.Equal(status, appointment.Status);
        Assert.Equal(cageId, appointment.CageId);
        Assert.Equal(petId, appointment.PetId);
        Assert.Equal(SizeGroup.Large, appointment.SizeGroup);
        Assert.Equal(Start, appointment.PlannedCheckIn);
        Assert.Equal(Start.AddDays(2), appointment.PlannedCheckOut);
    }

    [Fact]
    public void Hotel_ChangeByManager_InStay_ThrowsAndKeepsData()
    {
        var appointment = new HotelAppointment { Status = AppointmentStatus.InStay, PlannedCheckIn = Start };

        AssertError(
            ErrorCodes.InvalidTransition,
            () => appointment.ChangeByManager(Guid.NewGuid(), SizeGroup.Small, Start.AddDays(1), Start.AddDays(2)));

        Assert.Equal(Start, appointment.PlannedCheckIn);
    }

    [Fact]
    public void Hotel_ReplaceCage_Confirmed_ReplacesCageAndKeepsStatus()
    {
        var appointment = new HotelAppointment { Status = AppointmentStatus.Confirmed, SizeGroup = SizeGroup.Small, CageId = Guid.NewGuid() };
        var cage = new Cage { CageId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };

        appointment.ReplaceCage(cage, Species.Dog);

        Assert.Equal(cage.CageId, appointment.CageId);
        Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
    }

    [Theory]
    [InlineData(false, Species.Dog, SizeGroup.Small)]
    [InlineData(true, Species.Cat, SizeGroup.Small)]
    [InlineData(true, Species.Dog, SizeGroup.Large)]
    public void Hotel_ReplaceCage_IncompatibleCage_ThrowsCageConflict(bool isActive, Species cageSpecies, SizeGroup cageSize)
    {
        var oldCageId = Guid.NewGuid();
        var appointment = new HotelAppointment { Status = AppointmentStatus.Confirmed, SizeGroup = SizeGroup.Small, CageId = oldCageId };
        var cage = new Cage { CageId = Guid.NewGuid(), Species = cageSpecies, SizeGroup = cageSize, IsActive = isActive };

        AssertError(ErrorCodes.CageConflict, () => appointment.ReplaceCage(cage, Species.Dog));

        Assert.Equal(oldCageId, appointment.CageId);
    }

    [Fact]
    public void Hotel_ReplaceCage_Pending_ThrowsInvalidTransition()
    {
        var appointment = new HotelAppointment { Status = AppointmentStatus.Pending, SizeGroup = SizeGroup.Small };
        var cage = new Cage { CageId = Guid.NewGuid(), Species = Species.Dog, SizeGroup = SizeGroup.Small, IsActive = true };

        AssertError(ErrorCodes.InvalidTransition, () => appointment.ReplaceCage(cage, Species.Dog));

        Assert.Null(appointment.CageId);
    }
}
