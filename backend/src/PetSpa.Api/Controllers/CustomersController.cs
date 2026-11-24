using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Auth;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
public sealed class CustomersController(AccountService accountService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.ReceptionistOrManager)]
    [EndpointSummary("Lễ tân tìm khách hàng; quản lý xem khách bị khóa tự đặt lịch")]
    [EndpointDescription("search là số điện thoại (khớp một phần). Lễ tân tìm trong mọi khách hàng. Quản lý chỉ nhận khách đang bị khóa quyền tự đặt lịch (isBookingLocked = true) để gỡ khóa (FR-BOOK-07). Mặc định page = 1, pageSize = 20 (tối đa 100).")]
    public async Task<IActionResult> Search([FromQuery] ListCustomersQuery query, CancellationToken ct)
    {
        var result = await accountService.SearchCustomersAsync(
            User.ToCurrentUser(), query.Search, query.Page, query.PageSize, ct);
        return Ok(result);
    }

    [HttpPost("walk-in")]
    [Authorize(Policy = AuthorizationPolicies.Receptionist)]
    [EndpointSummary("Lễ tân ghi nhận khách vãng lai")]
    [EndpointDescription("Tạo khách hàng không có tài khoản đăng nhập. Trùng thông tin liên hệ trả 409 DUPLICATE_CONTACT, lễ tân chọn khách hiện có.")]
    public async Task<IActionResult> CreateWalkIn([FromBody] WalkInRequest request, CancellationToken ct)
    {
        var customerId = await accountService.CreateWalkInAsync(request.FullName, request.Phone, ct);
        return StatusCode(StatusCodes.Status201Created, new WalkInResponse(customerId));
    }

    [HttpPost("{id}/unlock-booking")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    [EndpointSummary("Quản lý gỡ khóa quyền tự đặt lịch")]
    [EndpointDescription("Đặt IsBookingLocked = false để khách hàng tự đặt lịch trực tuyến trở lại (FR-BOOK-07, BR-15). Không tìm thấy khách hàng trả 404 NOT_FOUND; khách hàng không bị khóa trả 409 CUSTOMER_NOT_LOCKED. Thành công trả 204.")]
    public async Task<IActionResult> UnlockBooking(Guid id, CancellationToken ct)
    {
        await accountService.UnlockBookingAsync(id, ct);
        return NoContent();
    }
}
