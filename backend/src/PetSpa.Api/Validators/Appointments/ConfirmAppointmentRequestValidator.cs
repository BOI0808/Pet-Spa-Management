using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ConfirmAppointmentRequestValidator : AbstractValidator<ConfirmAppointmentRequest>
{
    public ConfirmAppointmentRequestValidator()
    {
        RuleFor(x => x.CageId)
            .NotEmpty().WithMessage("Chuồng là bắt buộc.");
    }
}