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
            .NotNull().WithMessage("Thời điểm nhận là bắt buộc.")
            .GreaterThan(DateTimeOffset.UtcNow).WithMessage("Thời điểm nhận phòng phải ở tương lai.");

        RuleFor(x => x.To)
            .NotNull().WithMessage("Thời điểm trả là bắt buộc.")
            .GreaterThan(x => x.From)
            .When(x => x.From.HasValue && x.To.HasValue)
            .WithMessage("Ngày trả phòng phải sau ngày nhận phòng.");
    }
}
