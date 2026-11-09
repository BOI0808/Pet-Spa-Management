using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

// Một mốc giờ cần xét: giờ địa phương để hiển thị/so với LatestStartTime, thời điểm bắt đầu để so với ca làm và lịch hẹn.
public sealed record SlotCandidate(TimeOnly Time, DateTimeOffset Start);

public sealed record SlotResult(TimeOnly Time, SlotStatus Status);

// Một ca làm của nhân viên spa đang hoạt động.
public sealed record StaffShift(Guid StaffId, DateTimeOffset Start, DateTimeOffset End);

// Một lịch spa đang giữ chỗ. BusyUntil đã gồm thời gian dọn dẹp.
public sealed record HeldBooking(DateTimeOffset Start, DateTimeOffset BusyUntil, int StaffRequired);

// Nhân viên spa đang hoạt động, kèm số lịch được phân công gần nhất (không tính lịch Cancelled).
public sealed record StaffCandidate(Guid StaffId, string FullName, int RecentAssignmentCount);

// Một lượt giữ chỗ nhân viên của lịch đang giữ. BusyUntil đã gồm thời gian dọn dẹp.
public sealed record StaffAssignment(Guid StaffId, DateTimeOffset BusyFrom, DateTimeOffset BusyUntil);

// Suggested: n người đầu danh sách (có thể ít hơn n nếu không đủ người). Alternatives: phần còn lại đã đạt hai điều kiện lọc.
public sealed record StaffSuggestionResult(IReadOnlyList<StaffCandidate> Suggested, IReadOnlyList<StaffCandidate> Alternatives);

// Tính toán trạng thái các mốc giờ spa dựa trên dữ liệu thuần túy được truyền vào.
public static class SlotService
{
    private static readonly TimeOnly AfternoonStart = new(12, 0);
    private static readonly TimeOnly EveningStart = new(15, 0);

    // Lấy số nhân viên lớn nhất trong các dịch vụ; nếu thú cưng có tính khí khó tính (Difficult) thì tối thiểu 2.
    public static int RequiredStaff(IEnumerable<int> staffRequiredOfServices, Temperament temperament)
    {
        var required = staffRequiredOfServices.Max();
        return temperament == Temperament.Difficult ? Math.Max(required, 2) : required;
    }

    public static SlotGroup GroupOf(TimeOnly time)
    {
        if (time < AfternoonStart) return SlotGroup.Morning;
        if (time < EveningStart) return SlotGroup.Afternoon;
        return SlotGroup.Evening;
    }

    // Đề xuất nhân viên cho khoảng giữ chỗ [holdStart, holdEnd). staff là danh sách nhân viên spa đang hoạt động.
    // Lọc: (1) có ca phủ trọn khoảng giữ chỗ; (2) chưa có lượt giữ chỗ nào trùng khoảng.
    // Sắp theo số lịch gần đây tăng dần, bằng nhau xếp theo tên; lấy staffRequired người đầu làm đề xuất.
    public static StaffSuggestionResult SuggestStaff(
        IReadOnlyList<StaffCandidate> staff,
        IReadOnlyList<StaffShift> shifts,
        IReadOnlyList<StaffAssignment> assignments,
        DateTimeOffset holdStart,
        DateTimeOffset holdEnd,
        int staffRequired)
    {
        var ranked = staff
            .Where(s => shifts.Any(w => w.StaffId == s.StaffId && w.Start <= holdStart && w.End >= holdEnd))
            .Where(s => !assignments.Any(a => a.StaffId == s.StaffId && a.BusyFrom < holdEnd && a.BusyUntil > holdStart))
            .OrderBy(s => s.RecentAssignmentCount)
            .ThenBy(s => s.FullName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(s => s.StaffId)
            .ToList();

        return new StaffSuggestionResult(ranked.Take(staffRequired).ToList(), ranked.Skip(staffRequired).ToList());
    }

    public static IReadOnlyList<SlotResult> AvailableSlots(
        IReadOnlyList<SlotCandidate> candidates,
        TimeOnly latestStart,
        int durationMinutes,
        int staffRequired,
        int bufferMinutes,
        IReadOnlyList<StaffShift> shifts,
        IReadOnlyList<HeldBooking> held)
    {
        var results = new List<SlotResult>(candidates.Count);

        foreach (var slot in candidates)
        {
            // Mốc muộn hơn mốc bắt đầu muộn nhất của dịch vụ: không nhận, xét trước khi xét chỗ.
            if (slot.Time > latestStart)
            {
                results.Add(new SlotResult(slot.Time, SlotStatus.NotAccepted));
                continue;
            }

            var end = slot.Start.AddMinutes(durationMinutes + bufferMinutes);

            // Chỉ đếm nhân viên có một ca phủ trọn khoảng giữ chỗ.
            var staffAvailable = shifts
                .Where(s => s.Start <= slot.Start && s.End >= end)
                .Select(s => s.StaffId)
                .Distinct()
                .Count();

            var free = staffAvailable - PeakLoad(held, slot.Start, end);
            results.Add(new SlotResult(slot.Time, free >= staffRequired ? SlotStatus.Available : SlotStatus.Full));
        }

        return results;
    }

    // Tải đỉnh: số nhân viên bị chiếm lớn nhất tại cùng một thời điểm trong [from, to).
    // Tải chỉ tăng tại lúc một lịch bắt đầu nên chỉ cần xét from và các thời điểm bắt đầu trong khoảng.
    private static int PeakLoad(IReadOnlyList<HeldBooking> held, DateTimeOffset from, DateTimeOffset to)
    {
        var overlapping = held.Where(h => h.Start < to && h.BusyUntil > from).ToList();
        if (overlapping.Count == 0) return 0;

        return overlapping
            .Select(h => h.Start)
            .Where(t => t > from)
            .Append(from)
            .Max(t => overlapping.Where(h => h.Start <= t && t < h.BusyUntil).Sum(h => h.StaffRequired));
    }
}

