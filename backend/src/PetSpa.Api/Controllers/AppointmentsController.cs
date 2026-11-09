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
public sealed class AppointmentsController(
    BookingService bookingService,
    AssignmentService assignmentService,
    HotelAssignmentService hotelAssignment) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý xem danh sách lịch hẹn toàn cửa hàng")]
    [EndpointDescription("Hiện chỉ quản lý gọi được; phạm vi của khách hàng, lễ tân, nhân viên spa do các việc xem lịch theo vai trò bổ sung. Lọc tùy chọn theo type (Spa | Hotel) và status; status=Pending cho danh sách Chờ xác nhận. Lịch tạo sớm nhất trước. Mặc định page = 1, pageSize = 20 (tối đa 100). type hoặc status sai giá trị trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> List([FromQuery] AppointmentListQuery query, CancellationToken ct)
    {
        var result = await bookingService.ListAppointmentsAsync(query.Type, query.Status, query.Page, query.PageSize, ct);
        return Ok(result);
    }

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
    [EndpointSummary("Quản lý xem đề xuất nhân viên spa hoặc chuồng lưu trú cho lịch Chờ xác nhận")]
    [EndpointDescription("Chỉ quản lý. Lịch spa trả đề xuất nhân viên ({ staffRequired, suggested, alternatives }). Lịch lưu trú trả đề xuất chuồng ({ cage }). Không tìm thấy lịch trả 404 NOT_FOUND; lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION.")]
    public async Task<IActionResult> GetSuggestions(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await assignmentService.GetSuggestionsAsync(id, ct);
            return Ok(SpaSuggestionsResponse.From(result));
        }
        catch (BusinessException ex) when (ex.Code == ErrorCodes.NotFound)
        {
            var cage = await hotelAssignment.SuggestCageAsync(id, ct);
            return Ok(HotelCageSuggestionResponse.From(cage));
        }
    }

    [HttpPost("{id}/confirm")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Xác nhận lịch hẹn kèm nhân viên hoặc chuồng")]
    [EndpointDescription("Chỉ quản lý. Spa: staffIds. Lưu trú: cageId. Lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION; không tìm thấy lịch trả 404 NOT_FOUND. Trùng chuồng/nhân viên trả 409 CAGE_CONFLICT / STAFF_CONFLICT.")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmAppointmentRequest request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        if (request.CageId.HasValue)
        {
            var status = await hotelAssignment.ConfirmAsync(id, request.CageId.Value, ct);
            return Ok(new AppointmentStatusResponse(status));
        }

        // Module xác nhận phân công nhân viên Spa (FR-ASG-02, FR-ASG-03) chưa được tích hợp
        throw new BusinessException(ErrorCodes.ValidationError, "Xác nhận lịch Spa chưa được hỗ trợ.");
    }

    [HttpPost("{id}/reject")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Từ chối lịch hẹn khi cửa hàng không thể đáp ứng")]
    [EndpointDescription("Chỉ quản lý, không có body. Lịch Chờ xác nhận chuyển sang Đã hủy với lý do StoreUnable. Lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION; không tìm thấy lịch hẹn trả 404 NOT_FOUND.")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var result = await hotelAssignment.RejectAsync(id, ct);
        return Ok(AppointmentRejectedResponse.From(result));
    }
}
