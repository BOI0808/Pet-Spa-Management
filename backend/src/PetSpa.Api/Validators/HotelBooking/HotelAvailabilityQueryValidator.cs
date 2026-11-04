using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class HotelAvailabilityQueryValidator : AbstractValidator<HotelAvailabilityQuery>
{
    public HotelAvailabilityQueryValidator()
    {
        RuleFor(x => x.PetId)
            .NotEmpty().WithMessage("Thú cưng là bắt buộc.");

        RuleFor(x => x.From)
            .NotNull().WithMessage("Thời điểm nhận là bắt buộc.");

        RuleFor(x => x.To)
            .NotNull().WithMessage("Thời điểm trả là bắt buộc.");
    }
}