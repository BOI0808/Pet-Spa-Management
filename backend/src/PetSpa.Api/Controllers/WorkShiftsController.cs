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
}