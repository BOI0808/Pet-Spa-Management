using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class ConfirmAppointmentRequestValidator : AbstractValidator<ConfirmAppointmentRequest>
{
    public ConfirmAppointmentRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => (x.CageId.HasValue && x.CageId.Value != Guid.Empty) ^ (x.StaffIds is { Count: > 0 }))
            .WithMessage("Yêu cầu xác nhận phải cung cấp chuồng (lưu trú) hoặc danh sách nhân viên (spa).");

        When(x => x.StaffIds is { Count: > 0 }, () =>
        {
            RuleFor(x => x.StaffIds!)
                .Must(ids => ids.Count is 1 or 2)
                .WithMessage("Danh sách nhân viên phải từ 1 đến 2 người.");

            RuleForEach(x => x.StaffIds!)
                .NotEmpty()
                .WithMessage("Mã nhân viên không được để trống.");
        });
    }
}