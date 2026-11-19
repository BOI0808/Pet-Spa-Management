using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record PaymentGatewayRequest(
    string TxnRef,
    decimal Amount,
    string OrderInfo,
    string ClientIp,
    DateTimeOffset CreatedAt);

public interface IPaymentGateway
{
    PaymentGateway Gateway { get; }

    string CreatePaymentUrl(PaymentGatewayRequest request);
}
