using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Application.Common;

namespace PetSpa.Api.Validators;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.UserName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập số điện thoại.")
            .Must(PhoneNumber.IsValid).WithMessage("Số điện thoại không đúng định dạng.");

        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập họ tên.")
            .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.");

        RuleFor(x => x.Email)
            .MaximumLength(150).WithMessage("Email tối đa 150 ký tự.")
            .EmailAddress().WithMessage("Email không đúng định dạng.")
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}