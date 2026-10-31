using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class CreateWorkShiftRequestValidator : AbstractValidator<CreateWorkShiftRequest>
{
    public CreateWorkShiftRequestValidator()
    {
        RuleFor(x => x.StaffId)
            .NotNull().WithMessage("Vui lòng chọn nhân viên.");

        RuleFor(x => x.ShiftStart)
            .NotNull().WithMessage("Vui lòng nhập giờ bắt đầu ca.");

        RuleFor(x => x.ShiftEnd)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng nhập giờ kết thúc ca.")
            .Must((x, end) => x.ShiftStart is null || end > x.ShiftStart)
            .WithMessage("Giờ kết thúc phải sau giờ bắt đầu.");
    }
}

public sealed class ListWorkShiftsQueryValidator : AbstractValidator<ListWorkShiftsQuery>
{
    public ListWorkShiftsQueryValidator()
    {
        // Giống ListCustomersQueryValidator và PetListQueryValidator đã merge.
        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");
    }
}

public sealed class UpdateWorkShiftRequestValidator : AbstractValidator<UpdateWorkShiftRequest>
{
    public UpdateWorkShiftRequestValidator()
    {
        RuleFor(x => x.ShiftStart)
            .NotNull().WithMessage("Vui lòng nhập giờ bắt đầu ca.");

        RuleFor(x => x.ShiftEnd)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng nhập giờ kết thúc ca.")
            .Must((x, end) => x.ShiftStart is null || end > x.ShiftStart)
            .WithMessage("Giờ kết thúc phải sau giờ bắt đầu.");
    }
}