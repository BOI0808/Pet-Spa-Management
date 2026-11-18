using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Common;
using PetSpa.Application.Services.Payments;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class PaymentsController(PaymentService paymentService) : ControllerBase
{
    [HttpGet("appointments/{id}/payments")]
    [Authorize]
    [EndpointSummary("Xem các khoản thanh toán của một lịch hẹn theo phạm vi vai trò")]
    [EndpointDescription("Khách hàng chỉ xem lịch của mình; nhân viên spa chỉ xem lịch spa được phân công cho mình; lễ tân và quản lý xem toàn cửa hàng. Lịch spa có tối đa 1 khoản (Spa); lịch lưu trú có tối đa 2 khoản (Stay, LateFee); chưa có khoản nào trả mảng rỗng. Ngoài phạm vi trả 403 FORBIDDEN và không trả thông tin; không tìm thấy lịch hẹn trả 404 NOT_FOUND.")]
    public async Task<IActionResult> ListByAppointment(Guid id, CancellationToken ct)
    {
        var payments = await paymentService.ListByAppointmentAsync(User.ToCurrentUser(), id, ct);
        return Ok(payments.Select(PaymentResponse.From).ToList());
    }

    [HttpGet("payments")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý theo dõi tình hình thanh toán toàn cửa hàng")]
    [EndpointDescription("Chỉ quản lý. Lọc tùy chọn theo status (Unpaid, Paid); lịch hẹn tạo mới nhất trước. Mặc định page = 1, pageSize = 20 (tối đa 100). status, page hoặc pageSize không hợp lệ trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> List([FromQuery] ListPaymentsQuery query, CancellationToken ct)
    {
        var result = await paymentService.ListAsync(query.Status, query.Page, query.PageSize, ct);
        return Ok(new PagedResult<PaymentResponse>(
            result.Items.Select(PaymentResponse.From).ToList(), result.Page, result.PageSize, result.Total));
    }

    [HttpPost("payments/{id}/counter")]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân hoặc quản lý ghi nhận thanh toán tại quầy")]
    [EndpointDescription("Chỉ lễ tân và quản lý. Body { method, receivedAmount } với method là Cash hoặc BankQR; số tiền phải trả do hệ thống xác định, không nhận từ client. Thành công trả { status = Paid } và lưu người xác nhận. Thiếu hoặc sai method, receivedAmount trả 400 VALIDATION_ERROR; không tìm thấy khoản thanh toán trả 404 NOT_FOUND. Sai thời điểm theo BR-07 trả 409 PAYMENT_NOT_DUE; số tiền nhận thấp hơn số tiền phải trả trả 409 AMOUNT_MISMATCH; khoản Stay khi lịch đang chờ khách xác nhận chi phí mới trả 409 COST_CONFIRMATION_PENDING; khoản đã thanh toán trả 409 INVALID_TRANSITION.")]
    public async Task<IActionResult> RecordCounter(Guid id, [FromBody] CounterPaymentRequest request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var status = await paymentService.RecordCounterAsync(
            User.ToCurrentUser(), id, request.Method!.Value, request.ReceivedAmount!.Value, ct);
        return Ok(new PaymentStatusResponse(status));
    }
}