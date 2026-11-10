using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class StaffOutOfShiftTests
{
    private static DateTimeOffset At(int hour, int minute = 0) =>
        new(2026, 11, 14, hour, minute, 0, TimeSpan.Zero);

    // Khoảng giữ chỗ dùng chung: 10:00 – 12:15 (2 giờ + 15 phút dọn dẹp).
    private static readonly DateTimeOffset HoldStart = At(10);
    private static readonly DateTimeOffset HoldEnd = At(12, 15);

    private static IReadOnlyList<Guid> OutOfShift(IReadOnlyCollection<Guid> staffIds, params StaffShift[] shifts) =>
        SlotService.FindStaffOutOfShift(staffIds, shifts, HoldStart, HoldEnd);

    [Fact]
    public void StaffWhoseShiftCoversWholeHoldRange_IsNotOutOfShift()
    {
        var staff = Guid.NewGuid();

        var result = OutOfShift([staff], new StaffShift(staff, At(8), At(22)));

        Assert.Empty(result);
    }

    [Fact]
    public void ShiftEndingExactlyAtHoldEnd_StillCovers()
    {
        var staff = Guid.NewGuid();

        var result = OutOfShift([staff], new StaffShift(staff, At(10), At(12, 15)));

        Assert.Empty(result);
    }

    [Fact]
    public void StaffWhoseShiftEndsBeforeHoldEnd_IsOutOfShift()
    {
        var staff = Guid.NewGuid();

        var result = OutOfShift([staff], new StaffShift(staff, At(8), At(11)));

        Assert.Equal(new[] { staff }, result);
    }

    [Fact]
    public void StaffWithoutAnyShift_IsOutOfShift_AndShiftOfAnotherStaffDoesNotCount()
    {
        var withoutShift = Guid.NewGuid();
        var other = Guid.NewGuid();

        var result = OutOfShift([withoutShift], new StaffShift(other, At(8), At(22)));

        Assert.Equal(new[] { withoutShift }, result);
    }
}

