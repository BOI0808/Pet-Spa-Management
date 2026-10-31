namespace PetSpa.Api.Dtos;

// FR-STF-04. Id và giờ là kiểu nullable để phân biệt "không gửi" với giá trị mặc định.
// Giờ có thể kèm offset (vd +07:00): WorkShiftService đổi về UTC.
public sealed record CreateWorkShiftRequest(Guid? StaffId, DateTimeOffset? ShiftStart, DateTimeOffset? ShiftEnd);

public sealed record CreateWorkShiftResponse(Guid ShiftId);

// GET /work-shifts?staffId=&from=&to=&page=&pageSize=
// from, to: lấy ca giao với khoảng [from, to]; bỏ trống một đầu thì không lọc đầu đó.
public sealed class ListWorkShiftsQuery
{
    public Guid? StaffId { get; init; }
    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

// PUT /work-shifts/{id}. Không có staffId: ca không đổi người.
public sealed record UpdateWorkShiftRequest(DateTimeOffset? ShiftStart, DateTimeOffset? ShiftEnd);