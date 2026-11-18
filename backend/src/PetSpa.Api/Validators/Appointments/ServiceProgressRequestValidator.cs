using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ServiceProgressRequestValidator : AbstractValidator<ServiceProgressRequest>
{
    public ServiceProgressRequestValidator()
    {
        RuleFor(x => x.IsDone)
            .NotNull().WithMessage("Trạng thái hoàn thành (isDone) là bắt buộc.");
    }
}
