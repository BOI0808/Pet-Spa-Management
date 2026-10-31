using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.StaffManagement;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/work-shifts")]
[Authorize(Policy = AuthorizationPolicies.Manager)]
public sealed class WorkShiftsController(WorkShiftService workShiftService) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Quản lý xem ca làm của nhân viên spa")]
    [EndpointDescription("Lọc tùy chọn theo staffId và khoảng from, to (lấy ca giao với khoảng đó). Sắp xếp theo giờ bắt đầu. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] ListWorkShiftsQuery query, CancellationToken ct)
    {
        var result = await workShiftService.ListAsync(
            query.StaffId, query.From, query.To, query.Page, query.PageSize, ct);
        return Ok(result);
    }

    [HttpPost]
    [EndpointSummary("Quản lý thêm ca làm cho nhân viên spa")]
    [EndpointDescription("Chỉ nhân viên spa đang hoạt động (lễ tân, nhân viên đã vô hiệu hóa hoặc không tồn tại trả 400 VALIDATION_ERROR). shiftEnd phải sau shiftStart. Chồng ca của cùng nhân viên trả 409 SHIFT_OVERLAP.")]
    public async Task<IActionResult> Create([FromBody] CreateWorkShiftRequest request, CancellationToken ct)
    {
        var shiftId = await workShiftService.CreateAsync(
            request.StaffId!.Value, request.ShiftStart!.Value, request.ShiftEnd!.Value, ct);
        return StatusCode(StatusCodes.Status201Created, new CreateWorkShiftResponse(shiftId));
    }
    
    [HttpPut("{id}")]
    [EndpointSummary("Quản lý sửa ca làm")]
    [EndpointDescription("Đổi giờ bắt đầu, giờ kết thúc. Chồng ca khác của nhân viên trả 409 SHIFT_OVERLAP; còn lịch Đã xác nhận của nhân viên trong phần ca bị bỏ trả 409 SHIFT_HAS_APPOINTMENTS (lịch Chờ xác nhận không chặn).")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateWorkShiftRequest request, CancellationToken ct)
    {
        await workShiftService.UpdateAsync(id, request.ShiftStart!.Value, request.ShiftEnd!.Value, ct);
        return Ok();
    }

    [HttpDelete("{id}")]
    [EndpointSummary("Quản lý xóa ca làm")]
    [EndpointDescription("Cùng kiểm tra như sửa: còn lịch Đã xác nhận của nhân viên trong ca trả 409 SHIFT_HAS_APPOINTMENTS. Không tìm thấy ca trả 404.")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await workShiftService.DeleteAsync(id, ct);
        return NoContent();
    }
}