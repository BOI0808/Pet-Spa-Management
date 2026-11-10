using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SpaAppointmentAssignStaffTests
{
    private static readonly DateTimeOffset SlotStart = new(2026, 11, 14, 3, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset SlotEnd = SlotStart.AddHours(2);
    private static readonly DateTimeOffset BusyUntil = SlotEnd.AddMinutes(15);

    private static SpaAppointment Spa(AppointmentStatus status = AppointmentStatus.Pending, short staffRequired = 1) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = status,
        StaffRequired = staffRequired,
        SlotStart = SlotStart,
        SlotEnd = SlotEnd,
        BusyUntil = BusyUntil,
    };

    [Fact]
    public void AssignStaff_WhenPendingAndStaffCountMatches_ConfirmsAndReturnsHoldingRows()
    {
        var spa = Spa(staffRequired: 2);
        var staffA = Guid.NewGuid();
        var staffB = Guid.NewGuid();

        var rows = spa.AssignStaff([staffA, staffB]);

        Assert.Equal(AppointmentStatus.Confirmed, spa.Status);
        Assert.Equal(2, rows.Count);
        Assert.Contains(rows, r => r.StaffId == staffA);
        Assert.Contains(rows, r => r.StaffId == staffB);
        Assert.All(rows, r =>
        {
            Assert.Equal(spa.AppointmentId, r.AppointmentId);
            Assert.Equal(SlotStart, r.BusyFrom);
            Assert.Equal(BusyUntil, r.BusyUntil);
            Assert.True(r.IsHolding);
        });
    }

    [Theory]
    [InlineData(2, 1)] // cần 2, chọn 1
    [InlineData(1, 2)] // cần 1, chọn 2
    public void AssignStaff_WhenStaffCountDiffersFromRequired_ThrowsStaffCountMismatch(int required, int chosen)
    {
        var spa = Spa(staffRequired: (short)required);
        var staffIds = Enumerable.Range(0, chosen).Select(_ => Guid.NewGuid()).ToList();

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff(staffIds));

        Assert.Equal(ErrorCodes.StaffCountMismatch, ex.Code);
        Assert.Equal(AppointmentStatus.Pending, spa.Status);
    }

    [Fact]
    public void AssignStaff_WhenSameStaffChosenTwice_CountsOnce()
    {
        var spa = Spa(staffRequired: 2);
        var staffA = Guid.NewGuid();

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff([staffA, staffA]));

        Assert.Equal(ErrorCodes.StaffCountMismatch, ex.Code);
        Assert.Equal(AppointmentStatus.Pending, spa.Status);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.Received)]
    [InlineData(AppointmentStatus.InProgress)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void AssignStaff_WhenNotPending_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var spa = Spa(status);

        var ex = Assert.Throws<BusinessException>(() => spa.AssignStaff([Guid.NewGuid()]));

        Assert.Equal(ErrorCodes.InvalidTransition, ex.Code);
        Assert.Equal(status, spa.Status);
    }
}

