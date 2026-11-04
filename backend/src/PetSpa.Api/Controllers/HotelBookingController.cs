using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class HotelBookingController(HotelBookingService hotelBooking) : ControllerBase
{
    [HttpGet("hotel/availability")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionistOrManager)]
    [EndpointSummary("Xem còn chỗ lưu trú, số đêm và tiền lưu trú tạm tính")]
    [EndpointDescription("Khách hàng (thú cưng của mình), lễ tân, quản lý. Còn chỗ khi có ít nhất một chuồng phù hợp loài và nhóm kích cỡ trống trong toàn bộ các đêm; số đêm tính theo ngày ở múi giờ cửa hàng. Ngày trả không sau ngày nhận trả 400 VALIDATION_ERROR. Tiền tạm tính = số đêm × (giá lưu trú + giá thức ăn) theo hồ sơ thú cưng.")]
    public async Task<IActionResult> GetAvailability([FromQuery] HotelAvailabilityQuery query, CancellationToken ct)
    {
        var result = await hotelBooking.CheckAvailabilityAsync(
            User.ToCurrentUser(), query.PetId!.Value, query.From!.Value, query.To!.Value, ct);
        return Ok(HotelAvailabilityResponse.From(result));
    }
}