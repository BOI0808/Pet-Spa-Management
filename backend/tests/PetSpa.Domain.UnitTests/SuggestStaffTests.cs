using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class SuggestStaffTests
{
    private static DateTimeOffset At(int hour, int minute = 0) =>
        new(2026, 11, 10, hour, minute, 0, TimeSpan.Zero);

    // Khoảng giữ chỗ dùng chung: 10:00 – 12:15 (2 giờ + 15 phút dọn dẹp).
    private static readonly DateTimeOffset HoldStart = At(10);
    private static readonly DateTimeOffset HoldEnd = At(12, 15);

    private static StaffCandidate Staff(string name, int recent = 0) => new(Guid.NewGuid(), name, recent);

    private static StaffShift Shift(StaffCandidate s, int fromHour, int toHour) =>
        new(s.StaffId, At(fromHour), At(toHour));

    private static StaffAssignment Busy(StaffCandidate s, int fromHour, int toHour) =>
        new(s.StaffId, At(fromHour), At(toHour));

    private static StaffSuggestionResult Suggest(
        IReadOnlyList<StaffCandidate> staff,
        IReadOnlyList<StaffShift> shifts,
        IReadOnlyList<StaffAssignment> assignments,
        int staffRequired = 1) =>
        SlotService.SuggestStaff(staff, shifts, assignments, HoldStart, HoldEnd, staffRequired);

    private static string[] Names(IReadOnlyList<StaffCandidate> list) => list.Select(s => s.FullName).ToArray();

    [Fact]
    public void OnlyStaffWhoseShiftCoversWholeHoldRange_AreSuggested()
    {
        var covered = Staff("An");
        var shortShift = Staff("Binh"); // ca chỉ đến 11:00, không phủ trọn đến 12:15
        var noShift = Staff("Chi");

        var result = Suggest(
            [covered, shortShift, noShift],
            [Shift(covered, 8, 22), Shift(shortShift, 8, 11)],
            []);

        Assert.Equal(new[] { "An" }, Names(result.Suggested));
        Assert.Empty(result.Alternatives);
    }

    [Fact]
    public void StaffWithOverlappingAssignment_IsNotSuggested()
    {
        var busy = Staff("An");
        var free = Staff("Binh");

        var result = Suggest(
            [busy, free],
            [Shift(busy, 8, 22), Shift(free, 8, 22)],
            [Busy(busy, 11, 13)]); // 11:00–13:00 giao với 10:00–12:15

        Assert.Equal(new[] { "Binh" }, Names(result.Suggested));
        Assert.Empty(result.Alternatives);
    }

    [Fact]
    public void AssignmentEndingExactlyAtHoldStart_DoesNotOverlap()
    {
        var staff = Staff("An");

        var result = Suggest([staff], [Shift(staff, 8, 22)], [Busy(staff, 8, 10)]);

        Assert.Equal(new[] { "An" }, Names(result.Suggested));
    }

    [Fact]
    public void Suggests_StaffRequiredPeopleWithFewestRecentAssignments_RestAreAlternatives()
    {
        var an = Staff("An", recent: 5);
        var chi = Staff("Chi", recent: 2);
        var binh = Staff("Binh", recent: 2); // bằng số lịch với Chi: xếp theo tên

        var result = Suggest(
            [an, chi, binh],
            [Shift(an, 8, 22), Shift(chi, 8, 22), Shift(binh, 8, 22)],
            [],
            staffRequired: 2);

        Assert.Equal(new[] { "Binh", "Chi" }, Names(result.Suggested));
        Assert.Equal(new[] { "An" }, Names(result.Alternatives));
    }

    [Fact]
    public void NotEnoughEligibleStaff_SuggestsOnlyThoseAvailable()
    {
        var an = Staff("An");

        var result = Suggest([an], [Shift(an, 8, 22)], [], staffRequired: 2);

        Assert.Equal(new[] { "An" }, Names(result.Suggested));
        Assert.Empty(result.Alternatives);
    }
}

