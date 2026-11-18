using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed class ListPaymentsQuery
{
    public PaymentStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public sealed record CounterPaymentRequest(PaymentMethod? Method, long? ReceivedAmount);

public sealed record PaymentStatusResponse(PaymentStatus Status);

public sealed record PaymentResponse(
    Guid PaymentId,
    Guid AppointmentId,
    PaymentKind Kind,
    long Amount,
    PaymentStatus Status,
    PaymentMethod? Method,
    long? ReceivedAmount,
    DateTimeOffset? PaidAt)
{
    public static PaymentResponse From(Payment payment) => new(
        payment.PaymentId,
        payment.AppointmentId,
        payment.Kind,
        (long)payment.Amount,
        payment.Status,
        payment.Method,
        (long?)payment.ReceivedAmount,
        payment.PaidAt);
}