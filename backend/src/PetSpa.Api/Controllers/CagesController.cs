using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/cages")]
public sealed class CagesController(HotelCatalogService hotelCatalog) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Xem danh sách chuồng và tình trạng")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Mỗi chuồng kèm occupant: null là chuồng trống; chuồng đang chứa thú cưng (lịch lưu trú Đang lưu trú) kèm thú cưng, khách hàng (chủ) và thời điểm trả dự kiến. Sắp xếp theo mã chuồng, gồm cả chuồng đã ngừng sử dụng (isActive = false). Mặc định page = 1, pageSize = 20 (tối đa 100); page hoặc pageSize không hợp lệ trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> List([FromQuery] CageListQuery query, CancellationToken ct)
    {
        var result = await hotelCatalog.ListCagesAsync(query.Page, query.PageSize, ct);
        var items = result.Items.Select(CageStatusResponse.From).ToList();
        return Ok(new PagedResult<CageStatusResponse>(items, result.Page, result.PageSize, result.Total));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Thêm chuồng")]
    [EndpointDescription("Chỉ quản lý. Chuồng mới ở trạng thái đang sử dụng và được tính vào sức chứa lưu trú. Mã chuồng trùng thì trả 409 DUPLICATE_CAGE_CODE.")]
    public async Task<IActionResult> Create(CageCreateRequest request, CancellationToken ct)
    {
        var cageId = await hotelCatalog.CreateCageAsync(request.ToInput(), ct);
        return StatusCode(StatusCodes.Status201Created, new CageCreatedResponse(cageId));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Cập nhật chuồng")]
    [EndpointDescription("Chỉ quản lý. Chỉ các trường được gửi mới được đổi. Mã chuồng trùng chuồng khác thì trả 409 DUPLICATE_CAGE_CODE.")]
    public async Task<IActionResult> Update(Guid id, CageUpdateRequest request, CancellationToken ct)
    {
        await hotelCatalog.UpdateCageAsync(id, request.ToInput(), ct);
        return Ok();
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Ngừng hoặc mở lại sử dụng chuồng")]
    [EndpointDescription("Chỉ quản lý. Chuồng ngừng sử dụng không còn được đề xuất, gán và không tính sức chứa.")]
    public async Task<IActionResult> SetStatus(Guid id, ActiveToggleRequest request, CancellationToken ct)
    {
        await hotelCatalog.SetCageActiveAsync(id, request.IsActive!.Value, ct);
        return NoContent();
    }
}