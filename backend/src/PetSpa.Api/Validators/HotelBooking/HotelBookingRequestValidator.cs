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
            .NotNull().WithMessage("Thời điểm nhận là bắt buộc.")
            .GreaterThan(DateTimeOffset.UtcNow).WithMessage("Thời điểm nhận phòng phải ở tương lai.");

        RuleFor(x => x.PlannedCheckOut)
            .NotNull().WithMessage("Thời điểm trả là bắt buộc.")
            .GreaterThan(x => x.PlannedCheckIn)
            .When(x => x.PlannedCheckIn.HasValue && x.PlannedCheckOut.HasValue)
            .WithMessage("Ngày trả phòng phải sau ngày nhận phòng.");
    }
}
