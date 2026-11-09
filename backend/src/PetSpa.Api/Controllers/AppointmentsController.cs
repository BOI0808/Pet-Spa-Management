using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(
    BookingService bookingService,
    HotelAssignmentService hotelAssignment,
    AppointmentQueryService appointmentQueryService) : ControllerBase
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

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng xem danh sách lịch hẹn của mình")]
    [EndpointDescription("Chỉ khách hàng; chỉ thấy lịch spa và lưu trú của chính mình, mới tạo trước. Lọc tùy chọn theo type (Spa, Hotel) và status. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] ListAppointmentsQuery query, CancellationToken ct)
    {
        var result = await appointmentQueryService.ListAsync(
            User.ToCurrentUser(), query.Type, query.Status, query.Page, query.PageSize, ct);

        var items = result.Items.Select(i => AppointmentResponse.From(i.Appointment, i.PetName)).ToList();
        return Ok(new PagedResult<AppointmentResponse>(items, result.Page, result.PageSize, result.Total));
    }

    [HttpGet("{id}")]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng xem chi tiết lịch hẹn của mình")]
    [EndpointDescription("Kiểm tra quyền sở hữu theo id: lịch của khách khác trả 403 FORBIDDEN và không trả thông tin; không tìm thấy trả 404. Lịch spa kèm danh sách dịch vụ và nhân viên được phân công (rỗng khi chưa xác nhận); lịch lưu trú trả hai danh sách rỗng.")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var detail = await appointmentQueryService.GetAsync(User.ToCurrentUser(), id, ct);
        return Ok(AppointmentDetailResponse.From(detail));
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
