using System.Net;
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

    [HttpPost("payments/{id}/online")]
    [Authorize(Policy = AuthorizationPolicies.Customer)]
    [EndpointSummary("Khách hàng khởi tạo thanh toán trực tuyến cho khoản thanh toán của mình")]
    [EndpointDescription("Chỉ khách hàng. Body { gateway } hiện chỉ hỗ trợ VNPAY. Chỉ khoản Spa chưa thanh toán của lịch spa đã hoàn thành (BR-09) thuộc về khách hàng (BR-16). Số tiền do hệ thống xác định, không nhận từ client. Thành công trả { paymentUrl, txnRef } để chuyển khách sang cổng thanh toán; kết quả cuối do webhook của cổng quyết định. Thiếu hoặc sai gateway, hoặc gateway chưa được hỗ trợ trả 400 VALIDATION_ERROR; không phải khoản thanh toán của mình trả 403 FORBIDDEN; không tìm thấy trả 404 NOT_FOUND; sai thời điểm theo BR-07 trả 409 PAYMENT_NOT_DUE; khoản đã thanh toán hoặc không phải khoản Spa trả 409 INVALID_TRANSITION.")]
    public async Task<IActionResult> PayOnline(Guid id, [FromBody] OnlinePaymentRequest request, CancellationToken ct)
    {
        if (request is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu yêu cầu không được để trống.");

        var result = await paymentService.InitiateOnlineAsync(
            User.ToCurrentUser(), id, request.Gateway!.Value, GetClientIp(), ct);
        return Ok(new OnlinePaymentCreatedResponse(result.PaymentUrl, result.TxnRef));
    }

    private string GetClientIp()
    {
        var address = HttpContext.Connection.RemoteIpAddress;
        if (address is null || IPAddress.IsLoopback(address))
            return "127.0.0.1";

        return address.IsIPv4MappedToIPv6 ? address.MapToIPv4().ToString() : address.ToString();
    }
}