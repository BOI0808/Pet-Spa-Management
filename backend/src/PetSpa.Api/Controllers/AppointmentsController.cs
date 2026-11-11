using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Booking;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
public sealed class AppointmentsController(
    BookingService bookingService,
    AssignmentService assignmentService,
    HotelAssignmentService hotelAssignment,
    AppointmentQueryService appointmentQueryService,
    AppointmentChangeService appointmentChangeService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrManager)]
    [EndpointSummary("Danh sách lịch hẹn, lịch sử, tổng quan tiến độ")]
    [EndpointDescription("Lọc theo phạm vi vai trò ở backend: Khách hàng chỉ thấy lịch của mình; Quản lý thấy toàn cửa hàng. Lọc tùy chọn theo type, status, petId. Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] AppointmentListQuery query, CancellationToken ct)
    {
        var currentUser = User.ToCurrentUser();
        if (currentUser.Role == UserRole.Manager)
        {
            var result = await bookingService.ListAppointmentsAsync(query.Type, query.Status, query.Page, query.PageSize, ct);
            return Ok(result);
        }

        var customerResult = await appointmentQueryService.ListAsync(
            currentUser, query.Type, query.Status, query.PetId, query.Page, query.PageSize, ct);
        return Ok(customerResult);
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
    [EndpointDescription("Chỉ quản lý. Spa: staffIds đủ số nhân viên cần của lịch, tùy chọn confirmOutOfShift. Lưu trú: cageId. Lịch không ở Chờ xác nhận trả 409 INVALID_TRANSITION; không tìm thấy lịch trả 404 NOT_FOUND. Spa: số nhân viên không khớp trả 409 STAFF_COUNT_MISMATCH; nhân viên không phải nhân viên spa đang hoạt động trả 400 VALIDATION_ERROR; trùng khung giờ trả 409 STAFF_CONFLICT; chọn nhân viên ngoài ca mà chưa gửi confirmOutOfShift = true trả 409 STAFF_OUT_OF_SHIFT. Lưu trú: trùng chuồng trả 409 CAGE_CONFLICT.")]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmAppointmentRequest request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        if (request.CageId.HasValue)
        {
            var status = await hotelAssignment.ConfirmAsync(id, request.CageId.Value, ct);
            return Ok(new AppointmentStatusResponse(status));
        }

        // Validator đã bảo đảm có staffIds khi không có cageId.
        var spa = await assignmentService.ConfirmSpaAsync(id, request.StaffIds!, request.ConfirmOutOfShift, ct);
        return Ok(new AppointmentStatusResponse(spa.Status));
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

    [HttpPost("{id}/cancel")]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng tự hủy lịch hẹn trong hạn")]
    [EndpointDescription("Chỉ khách hàng, không có body; lý do CustomerCancelled do backend đặt. Lịch của khách khác trả 403 FORBIDDEN; không tìm thấy trả 404 NOT_FOUND. Lịch không ở Chờ xác nhận hoặc Đã xác nhận trả 409 INVALID_TRANSITION. Quá hạn tự hủy trả 409 CHANGE_WINDOW_CLOSED (liên hệ hotline).")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var status = await appointmentChangeService.CancelAsync(User.ToCurrentUser(), id, ct);
        return Ok(new AppointmentStatusResponse(status));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng tự đổi lịch hẹn trong hạn")]
    [EndpointDescription("Chỉ khách hàng. Spa: slotStart, petId, serviceIds. Lưu trú: plannedCheckIn, plannedCheckOut, petId. Thành công: lịch về Chờ xác nhận, phân công nhân viên/chuồng bị bỏ (BR-26). Lịch hoặc thú cưng của khách khác trả 403 FORBIDDEN; không tìm thấy trả 404 NOT_FOUND. Thiếu trường hoặc dịch vụ không áp dụng cho loài trả 400 VALIDATION_ERROR. Quá hạn tự đổi trả 409 CHANGE_WINDOW_CLOSED; lịch sai trạng thái trả 409 INVALID_TRANSITION; mốc giờ đã kín trả 409 SLOT_FULL; hết chuồng trả 409 NO_CAPACITY.")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAppointmentRequest request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var status = await appointmentChangeService.ChangeAsync(User.ToCurrentUser(), id, request.ToInput(), ct);
        return Ok(new AppointmentStatusResponse(status));
    }
}
