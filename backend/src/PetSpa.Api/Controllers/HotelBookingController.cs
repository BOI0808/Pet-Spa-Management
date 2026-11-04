using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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

    [HttpPost("appointments/hotel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EnableRateLimiting(RateLimitPolicies.Booking)]
    [EndpointSummary("Tạo lịch lưu trú Chờ xác nhận")]
    [EndpointDescription("Khách hàng đặt cho thú cưng của mình (bỏ qua customerId); lễ tân đặt thay khách, bắt buộc kèm customerId và không bị áp dụng khóa đặt lịch. Khách tự đặt khi bị khóa trả 403 BOOKING_LOCKED. Hết chuồng phù hợp ở bất kỳ đêm nào trả 409 NO_CAPACITY. Ngày trả không sau ngày nhận trả 400 VALIDATION_ERROR. Lịch tạo ở trạng thái Pending, chưa gán chuồng; không kèm dịch vụ spa.")]
    public async Task<IActionResult> Create([FromBody] HotelBookingRequest request, CancellationToken ct)
    {
        var result = await hotelBooking.CreateAsync(User.ToCurrentUser(), request.ToInput(), request.CustomerId, ct);
        return StatusCode(StatusCodes.Status201Created, HotelBookingCreatedResponse.From(result));
    }
}