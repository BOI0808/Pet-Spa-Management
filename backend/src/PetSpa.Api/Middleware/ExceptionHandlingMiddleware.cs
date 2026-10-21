using System.Text.Json;
using PetSpa.Api.Dtos;
using PetSpa.Domain.Exceptions;

namespace PetSpa.Api.Middleware;

// Bắt mọi lỗi chưa xử lý trong pipeline và trả error envelope thống nhất.
// Phải đặt đầu pipeline (ngay sau builder.Build()) để bắt được lỗi của các middleware phía sau.
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        // Response đã bắt đầu gửi thì không thể ghi lại status/body nữa: để lỗi đi tiếp.
        catch (Exception exception) when (!context.Response.HasStarted)
        {
            await WriteErrorAsync(context, exception);
        }
    }

    private async Task WriteErrorAsync(HttpContext context, Exception exception)
    {
        ErrorResponse? error = exception switch
        {
            BusinessException business => ErrorCatalog.Create(business.Code, business.Detail),
            _ => null,
        };

        if (error is null)
        {
            // Lỗi không lường trước (hoặc mã lỗi chưa khai báo trong ErrorCatalog): 500, ghi log đầy đủ, không lộ chi tiết ra response.
            logger.LogError(exception, "Lỗi hệ thống tại {Method} {Path}", context.Request.Method, context.Request.Path);
            error = ErrorCatalog.Internal();
        }
        else
        {
            logger.LogWarning("Lỗi {ErrorCode} tại {Method} {Path}", error.Code, context.Request.Method, context.Request.Path);
        }

        context.Response.StatusCode = error.Status;
        await context.Response.WriteAsJsonAsync(error, (JsonSerializerOptions?)null, "application/problem+json");
    }
}