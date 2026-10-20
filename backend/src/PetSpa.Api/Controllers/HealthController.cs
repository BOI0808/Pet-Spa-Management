using Microsoft.AspNetCore.Mvc;
namespace PetSpa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>Kiểm tra API đang chạy.</summary>
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", time = DateTime.UtcNow });
}