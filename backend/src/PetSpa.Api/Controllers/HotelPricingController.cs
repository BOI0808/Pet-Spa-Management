using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/hotel/pricing")]
public sealed class HotelPricingController(HotelCatalogService hotelCatalog) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionistOrManager)]
    [EndpointSummary("Xem giá lưu trú, giá thức ăn và phí phạt trả muộn")]
    [EndpointDescription("Khách hàng, lễ tân, quản lý. Giá theo đêm cho từng loài và nhóm kích cỡ; lateFeePerBlock là phí phạt mỗi lần trả muộn. Chưa thiết lập thì pricing rỗng và lateFeePerBlock = 0.")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var snapshot = await hotelCatalog.GetPricingAsync(ct);
        return Ok(HotelPricingResponse.From(snapshot));
    }

    [HttpPut]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Thiết lập giá lưu trú, giá thức ăn và phí phạt trả muộn")]
    [EndpointDescription("Chỉ quản lý. Mỗi dòng pricing thêm mới hoặc cập nhật giá của một cặp loài và nhóm kích cỡ; dòng không gửi thì giữ nguyên. lateFeePerBlock chỉ chỉnh tại đây. Có hiệu lực cho các lịch lưu trú tạo sau đó.")]
    public async Task<IActionResult> Update(HotelPricingRequest request, CancellationToken ct)
    {
        await hotelCatalog.SavePricingAsync(request.ToInput(), ct);
        return Ok();
    }
}