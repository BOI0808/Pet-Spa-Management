using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class AppointmentListQueryValidator : AbstractValidator<AppointmentListQuery>
{
    public AppointmentListQueryValidator()
    {
        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("type phải là Spa hoặc Hotel.");

        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("status không hợp lệ.");

        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");
    }
}

