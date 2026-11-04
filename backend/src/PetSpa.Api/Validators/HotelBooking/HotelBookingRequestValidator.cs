using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class HotelBookingRequestValidator : AbstractValidator<HotelBookingRequest>
{
    public HotelBookingRequestValidator()
    {
        RuleFor(x => x.PetId)
            .NotEmpty().WithMessage("Thú cưng là bắt buộc.");

        RuleFor(x => x.PlannedCheckIn)
            .NotNull().WithMessage("Thời điểm nhận là bắt buộc.");

        RuleFor(x => x.PlannedCheckOut)
            .NotNull().WithMessage("Thời điểm trả là bắt buộc.");
    }
}