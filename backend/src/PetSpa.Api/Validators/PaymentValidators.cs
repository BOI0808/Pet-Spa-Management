using FluentValidation;
using PetSpa.Api.Dtos;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Validators;

public sealed class CounterPaymentRequestValidator : AbstractValidator<CounterPaymentRequest>
{
    private const long MaxAmount = 999_999_999_999;

    public CounterPaymentRequestValidator()
    {
        RuleFor(x => x.Method)
            .NotNull().WithMessage("Phương thức thanh toán là bắt buộc.")
            .Must(m => m is null or PaymentMethod.Cash or PaymentMethod.BankQR)
            .WithMessage("Phương thức thanh toán tại quầy phải là Cash hoặc BankQR.");

        RuleFor(x => x.ReceivedAmount)
            .NotNull().WithMessage("Số tiền thực nhận là bắt buộc.")
            .Must(v => v is null || (v >= 0 && v <= MaxAmount))
            .WithMessage("Số tiền thực nhận phải từ 0 đến 999.999.999.999 VND.");
    }
}

public sealed class ListPaymentsQueryValidator : AbstractValidator<ListPaymentsQuery>
{
    public ListPaymentsQueryValidator()
    {
        RuleFor(x => x.Status)
            .IsInEnum().WithMessage("status phải là Unpaid hoặc Paid.");

        RuleFor(x => x.Page)
            .InclusiveBetween(1, 1_000_000).WithMessage("page phải từ 1 đến 1.000.000.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("pageSize phải từ 1 đến 100.");
    }
}