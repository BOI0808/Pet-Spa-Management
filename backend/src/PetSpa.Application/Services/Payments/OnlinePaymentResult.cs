namespace PetSpa.Application.Services.Payments;

public sealed record OnlinePaymentResult(string PaymentUrl, string TxnRef);
