using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class UpdateAppointmentRequestValidator : AbstractValidator<UpdateAppointmentRequest>
{
    public UpdateAppointmentRequestValidator()
    {
        RuleFor(x => x.PetId)
            .NotNull().WithMessage("petId là bắt buộc.")
            .NotEqual(Guid.Empty).WithMessage("petId không hợp lệ.");

        RuleFor(x => x.ServiceIds)
            .Must(ids => ids is null || (ids.Count > 0 && ids.All(id => id != Guid.Empty)))
            .WithMessage("serviceIds phải gồm ít nhất một mã dịch vụ hợp lệ.");

        RuleFor(x => x.PlannedCheckOut)
            .GreaterThan(x => x.PlannedCheckIn)
            .When(x => x.PlannedCheckIn.HasValue && x.PlannedCheckOut.HasValue)
            .WithMessage("Ngày trả phải sau ngày nhận.");
    }
}
