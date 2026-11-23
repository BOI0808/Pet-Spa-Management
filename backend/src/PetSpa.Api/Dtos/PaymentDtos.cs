using System.Text.Json.Serialization;
using PetSpa.Application.Services.Payments;
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

public sealed record OnlinePaymentRequest(PaymentGateway? Gateway);

public sealed record OnlinePaymentCreatedResponse(string PaymentUrl, string TxnRef);

public sealed record VnpayIpnResponse(
    [property: JsonPropertyName("RspCode")] string RspCode,
    [property: JsonPropertyName("Message")] string Message)
{
    public static VnpayIpnResponse From(GatewayCallbackOutcome outcome) => outcome switch
    {
        GatewayCallbackOutcome.Paid or GatewayCallbackOutcome.Failed =>
            new VnpayIpnResponse("00", "Confirm Success"),
        GatewayCallbackOutcome.TransactionNotFound =>
            new VnpayIpnResponse("01", "Order not found"),
        GatewayCallbackOutcome.AlreadyProcessed =>
            new VnpayIpnResponse("02", "Order already confirmed"),
        GatewayCallbackOutcome.AmountMismatch =>
            new VnpayIpnResponse("04", "Invalid amount"),
        GatewayCallbackOutcome.InvalidSignature =>
            new VnpayIpnResponse("97", "Invalid Checksum"),
        _ => new VnpayIpnResponse("99", "Unknown error"),
    };
}

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