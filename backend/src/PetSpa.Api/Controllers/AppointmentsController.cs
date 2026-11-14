using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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
    AppointmentChangeService appointmentChangeService,
    CheckInService checkInService,
    WeightCheckService weightCheckService) : ControllerBase
{
    [HttpGet]
    [Authorize]
    [EndpointSummary("Danh sách lịch hẹn, lịch sử, tổng quan tiến độ")]
    [EndpointDescription("Lọc theo phạm vi vai trò ở backend: Khách hàng chỉ thấy lịch của mình; Lễ tân và Quản lý thấy toàn cửa hàng; Nhân viên spa chỉ thấy lịch spa đang được phân công cho mình. Lọc tùy chọn theo type, status, date, petId; petId chỉ áp dụng cho Khách hàng. Sắp xếp tùy chọn theo sort (time_asc, time_desc, created_desc, created_asc). Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> List([FromQuery] AppointmentListQuery query, CancellationToken ct)
    {
        var result = await appointmentQueryService.ListAsync(
            User.ToCurrentUser(), query.Type, query.Status, query.Date, query.PetId, query.ParsedSort, query.Page, query.PageSize, ct);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize]
    [EndpointSummary("Xem chi tiết lịch hẹn theo phạm vi vai trò")]
    [EndpointDescription("Khách hàng chỉ xem lịch của mình; Nhân viên spa chỉ xem lịch spa được phân công cho mình; Lễ tân và Quản lý xem toàn cửa hàng. Ngoài phạm vi trả 403 FORBIDDEN và không trả thông tin; không tìm thấy trả 404. Lịch spa kèm danh sách dịch vụ và nhân viên được phân công (rỗng khi chưa xác nhận); lịch lưu trú trả hai danh sách rỗng.")]
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

    [HttpPost("{id}/check-in")]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân hoặc quản lý tiếp nhận thú cưng lịch spa và đối chiếu cân nặng")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Lịch spa: body { actualWeightKg }; lịch Đã xác nhận chuyển sang Đã tiếp nhận khi chưa quá Booking.HoldMinutes sau giờ hẹn, đồng thời ghi nhận và đối chiếu cân nặng thực tế (BR-23). Trả { status, weightCheck } với weightCheck.result là OK, PRICE_DECREASED hoặc NEEDS_CONFIRMATION. Thiếu hoặc sai cân nặng trả 400 VALIDATION_ERROR. Lịch không ở Đã xác nhận hoặc đã quá thời gian giữ chỗ trả 409 INVALID_TRANSITION; không tìm thấy lịch spa trả 404 NOT_FOUND.")]
    public async Task<IActionResult> CheckIn(
        Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ActualWeightRequest? request, CancellationToken ct)
    {
        if (request?.ActualWeightKg is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Cân nặng thực tế là bắt buộc khi tiếp nhận lịch spa.");

        var result = await checkInService.CheckInSpaAsync(id, request.ActualWeightKg.Value, ct);
        return Ok(CheckInResponse.From(result));
    }

    [HttpPost("{id}/weight-check")]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân hoặc quản lý ghi nhận và đối chiếu cân nặng lịch lưu trú")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Body { actualWeightKg }. Chỉ áp dụng cho lịch lưu trú Đã xác nhận, thực hiện trước khi thu tiền lưu trú. Trả { weightCheck } với weightCheck.result là OK, PRICE_DECREASED hoặc NEEDS_CONFIRMATION (BR-23). Cân nặng không hợp lệ trả 400 VALIDATION_ERROR; lịch không phải lưu trú hoặc không ở Đã xác nhận trả 409 INVALID_TRANSITION; không tìm thấy lịch trả 404 NOT_FOUND.")]
    public async Task<IActionResult> WeightCheck(
        Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ActualWeightRequest? request, CancellationToken ct)
    {
        if (request?.ActualWeightKg is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Cân nặng thực tế là bắt buộc khi đối chiếu cân nặng lịch lưu trú.");

        var outcome = await weightCheckService.CheckHotelAsync(id, request.ActualWeightKg.Value, ct);
        return Ok(WeightCheckResponse.From(outcome));
    }

    [HttpPost("{id}/cancel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrManager)]
    [EndpointSummary("Khách hàng tự hủy lịch hẹn trong hạn, quản lý hủy lịch hẹn kèm lý do")]
    [EndpointDescription("Khách hàng: không có body; lý do CustomerCancelled do backend đặt; chỉ hủy lịch của mình ở Chờ xác nhận hoặc Đã xác nhận, trong hạn tự hủy. Quản lý: bắt buộc body { reason } là StoreUnable hoặc CustomerBeyondDeadline; hủy được lịch ở mọi trạng thái trước Hoàn tất, không giới hạn hạn tự hủy; thiếu hoặc gửi lý do khác trả 400 VALIDATION_ERROR. Lịch của khách khác trả 403 FORBIDDEN; không tìm thấy trả 404 NOT_FOUND. Lịch không hủy được ở trạng thái hiện tại trả 409 INVALID_TRANSITION. Khách quá hạn tự hủy trả 409 CHANGE_WINDOW_CLOSED (liên hệ hotline).")]
    public async Task<IActionResult> Cancel(
        Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelAppointmentRequest? request, CancellationToken ct)
    {
        var status = await appointmentChangeService.CancelAsync(User.ToCurrentUser(), id, request?.Reason, ct);
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
