using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Api.Validators;
using PetSpa.Application.Services.Assignment;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/appointments/{id}/photos")]
public sealed class AppointmentPhotosController(AppointmentPhotoService photoService) : ControllerBase
{
    private const long MaxRequestBytes = PhotoUploadRequestValidator.MaxFileBytes + 1024 * 1024;

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.SpaStaff)]
    [RequestSizeLimit(MaxRequestBytes)]
    [EndpointSummary("Nhân viên spa tải ảnh minh chứng trước/sau chăm sóc")]
    [EndpointDescription("Chỉ nhân viên spa được phân công cho lịch hẹn; quản lý, lễ tân, khách hàng trả 403 FORBIDDEN. Body multipart/form-data gồm kind (Before hoặc After) và file (chỉ tệp ảnh, tối đa 50 MB). Ảnh Before chỉ tải khi lịch Đã tiếp nhận, ảnh After chỉ khi lịch Đang thực hiện, sai trạng thái trả 409 INVALID_TRANSITION. Thiếu hoặc sai kind, thiếu tệp, tệp rỗng, không phải ảnh hoặc quá 50 MB trả 400 VALIDATION_ERROR. Không tìm thấy lịch hẹn trả 404 NOT_FOUND. Thành công trả 201 { photoId }.")]
    public async Task<IActionResult> Upload(Guid id, [FromForm] PhotoUploadRequest request, CancellationToken ct)
    {
        var file = request.File!;
        await using var stream = file.OpenReadStream();

        var photoId = await photoService.UploadAsync(
            User.ToCurrentUser(), id, request.Kind!.Value, stream, file.ContentType, ct);

        return StatusCode(StatusCodes.Status201Created, new PhotoCreatedResponse(photoId));
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrSpaStaffOrManager)]
    [EndpointSummary("Xem ảnh minh chứng trước/sau chăm sóc theo phạm vi")]
    [EndpointDescription("Khách hàng chỉ xem ảnh của lịch hẹn của mình; nhân viên spa chỉ xem ảnh của lịch được phân công cho mình; quản lý xem toàn cửa hàng; lễ tân trả 403 FORBIDDEN. Ngoài phạm vi trả 403 FORBIDDEN và không trả thông tin; không tìm thấy lịch hẹn trả 404 NOT_FOUND. Trả mảng { photoId, kind, url, uploadedAt }, cũ trước; url là URL tạm thời (hết hạn sau 1 giờ).")]
    public async Task<IActionResult> List(Guid id, CancellationToken ct)
    {
        var photos = await photoService.ListAsync(User.ToCurrentUser(), id, ct);
        return Ok(photos.Select(PhotoResponse.From).ToList());
    }
}
