using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(BookingService bookingService, HotelAssignmentService hotelAssignment) : ControllerBase
{
    [HttpPost("spa")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EnableRateLimiting(RateLimitPolicies.Booking)]
    [EndpointSummary("Tạo lịch hẹn spa Chờ xác nhận")]
    [EndpointDescription("Khách hàng chỉ đặt cho thú cưng của mình; lễ tân bắt buộc kèm customerId. Khách bị khóa trả 403 BOOKING_LOCKED. Mốc giờ đã kín trả 409 SLOT_FULL. Dịch vụ không áp dụng cho loài của thú cưng trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> CreateSpa([FromBody] SpaBookingRequest request, CancellationToken ct)
    {
        // Validator đã bảo đảm petId, serviceIds, slotStart hợp lệ.
        var result = await bookingService.CreateSpaAppointmentAsync(
            User.ToCurrentUser(), request.CustomerId, request.PetId!.Value, request.ServiceIds!, request.SlotStart!.Value, ct);

        return StatusCode(StatusCodes.Status201Created, SpaBookingResponse.From(result));
    }

    [HttpGet("{id}/suggestions")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Đề xuất chuồng cho lịch lưu trú Chờ xác nhận")]
    [EndpointDescription("Chỉ quản lý. Đề xuất một chuồng đang sử dụng, cùng loài và nhóm kích cỡ với thú cưng, không trùng đêm với lịch lưu trú Đã xác nhận hoặc Đang lưu trú khác; nhiều chuồng phù hợp thì chọn mã chuồng nhỏ nhất. Không còn chuồng phù hợp trả 200 với cage = null (quản lý từ chối lịch bằng /reject). Lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION; không tìm thấy lịch lưu trú trả 404 NOT_FOUND.")]
    public async Task<IActionResult> GetSuggestions(Guid id, CancellationToken ct)
    {
        var cage = await hotelAssignment.SuggestCageAsync(id, ct);
        return Ok(HotelCageSuggestionResponse.From(cage));
    }

    [HttpPost("{id}/confirm")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Xác nhận lịch lưu trú kèm chuồng")]
    [EndpointDescription("Chỉ quản lý. Gán cageId và chuyển lịch Chờ xác nhận sang Đã xác nhận. Chuồng không tồn tại hoặc không tìm thấy lịch trả 404 NOT_FOUND. Chuồng ngừng sử dụng, khác loài, khác nhóm kích cỡ hoặc đã gán cho lịch lưu trú khác trùng đêm trả 409 CAGE_CONFLICT. Lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION.")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmAppointmentRequest request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var status = await hotelAssignment.ConfirmAsync(id, request.CageId!.Value, ct);
        return Ok(new AppointmentStatusResponse(status));
    }
}
