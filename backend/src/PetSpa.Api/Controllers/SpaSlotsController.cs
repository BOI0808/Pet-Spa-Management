using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Booking;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/spa/slots")]
public sealed class SpaSlotsController(BookingService bookingService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrReceptionist)]
    [EndpointSummary("Xem các mốc giờ spa khả dụng trong ngày")]
    [EndpointDescription("Tham số: date (yyyy-MM-dd), petId, serviceIds (các mã dịch vụ ngăn cách bằng dấu phẩy). Trả thời lượng, số nhân viên cần, thời gian dọn dẹp và các mốc giờ với trạng thái Available | Full | NotAccepted. Khách hàng chỉ xem cho thú cưng của mình; lễ tân xem cho thú cưng của cửa hàng. Dịch vụ không áp dụng cho loài của thú cưng trả 400 VALIDATION_ERROR.")]
    public async Task<IActionResult> GetSlots([FromQuery] SpaSlotsQuery query, CancellationToken ct)
    {
        // Validator đã bảo đảm date, petId, serviceIds hợp lệ.
        SpaSlotsQuery.TryParseServiceIds(query.ServiceIds, out var serviceIds);

        var result = await bookingService.GetSpaSlotsAsync(
            User.ToCurrentUser(), query.Date!.Value, query.PetId!.Value, serviceIds, ct);

        return Ok(SpaSlotsResponse.From(result));
    }
}

