namespace PetSpa.Application.Services.Payments;

public enum GatewayCallbackOutcome
{
    Paid,
    Failed,
    TransactionNotFound,
    AlreadyProcessed,
    AmountMismatch
}

public sealed record GatewayCallbackResult(GatewayCallbackOutcome Outcome, string TxnRef, decimal? ConfirmedAmount);
