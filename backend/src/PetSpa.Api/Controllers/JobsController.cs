using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PetSpa.Api.Dtos;
using PetSpa.Api.Security;
using PetSpa.Application.Services.Assignment;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/v1/internal/jobs")]
public sealed class JobsController(AutoCancelService autoCancel, JobsOptions options) : ControllerBase
{
    [HttpPost("run")]
    [AllowAnonymous]
    [EndpointSummary("Kích hoạt tác vụ tự động")]
    [EndpointDescription("cron-job.org gọi mỗi 5 phút. Không dùng JWT và không nhận dữ liệu trong body; xác minh header X-Job-Secret (giá trị Jobs__Secret), thiếu hoặc sai trả 401 UNAUTHENTICATED. Xử lý idempotent: tự hủy lịch hẹn vắng mặt sau thời gian giữ chỗ (khách vắng mặt quá ngưỡng trong NoShow.WindowDays ngày gần nhất thì bị khóa quyền tự đặt lịch, FR-BOOK-06), tự hủy lịch hẹn khi khách không phản hồi chi phí mới quá hạn. Trả { processed } là số lịch hẹn đã bị hủy trong lần chạy này.")]
    public async Task<IActionResult> Run(
        [FromHeader(Name = "X-Job-Secret")] string? secret, CancellationToken ct)
    {
        if (!IsValidSecret(secret))
            throw new BusinessException(ErrorCodes.Unauthenticated);

        var processed = await autoCancel.RunAsync(ct);
        return Ok(new JobsResultResponse(processed));
    }

    // Chưa cấu hình Jobs__Secret thì mọi request đều bị từ chối. So sánh thời gian cố định để không lộ độ dài khớp.
    private bool IsValidSecret(string? provided)
    {
        if (string.IsNullOrEmpty(options.Secret) || string.IsNullOrEmpty(provided))
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(options.Secret),
            Encoding.UTF8.GetBytes(provided));
    }
}
