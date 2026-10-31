using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/cages")]
public sealed class CagesController(HotelCatalogService hotelCatalog) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Thêm chuồng")]
    [EndpointDescription("Chỉ quản lý. Chuồng mới ở trạng thái đang sử dụng và được tính vào sức chứa lưu trú. Mã chuồng trùng thì trả 409 DUPLICATE_CAGE_CODE.")]
    public async Task<IActionResult> Create(CageCreateRequest request, CancellationToken ct)
    {
        var cageId = await hotelCatalog.CreateCageAsync(request.ToInput(), ct);
        return StatusCode(StatusCodes.Status201Created, new CageCreatedResponse(cageId));
    }
}