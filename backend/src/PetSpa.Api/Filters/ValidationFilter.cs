using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;

namespace PetSpa.Api.Filters;

// Chạy FluentValidation cho mọi tham số của action có validator tương ứng
// Không đạt -> ném ValidationException
// ExceptionHandlingMiddleware đổi thành 400 VALIDATION_ERROR.
public sealed class ValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var services = context.HttpContext.RequestServices;

        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null) continue;

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (services.GetService(validatorType) is not IValidator validator) continue;

            var result = await validator.ValidateAsync(
                new ValidationContext<object>(argument),
                context.HttpContext.RequestAborted);

            if (!result.IsValid) throw new ValidationException(result.Errors);
        }

        await next();
    }
}