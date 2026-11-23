using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Payments;

public sealed class VnpayPaymentGateway(VnpayOptions options) : IPaymentGateway
{
    private const string DateFormat = "yyyyMMddHHmmss";
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);
    private static readonly TimeSpan PaymentLifetime = TimeSpan.FromMinutes(15);

    public PaymentGateway Gateway => PaymentGateway.VNPAY;

    public string CreatePaymentUrl(PaymentGatewayRequest request)
    {
        EnsureConfigured();

        var createdAt = request.CreatedAt.ToOffset(VietnamOffset);
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = options.TmnCode,
            ["vnp_Amount"] = ((long)(request.Amount * 100m)).ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = createdAt.ToString(DateFormat, CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = createdAt.Add(PaymentLifetime).ToString(DateFormat, CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = request.ClientIp,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = request.OrderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = options.ReturnUrl,
            ["vnp_TxnRef"] = request.TxnRef,
        };

        var query = string.Join(
            "&",
            parameters.Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

        return $"{options.PayUrl}?{query}&vnp_SecureHash={Sign(query)}";
    }

    public PaymentGatewayCallback VerifyCallback(IReadOnlyDictionary<string, string> parameters)
    {
        EnsureConfigured();

        var signedData = string.Join(
            "&",
            parameters
                .Where(p => p.Key.StartsWith("vnp_", StringComparison.Ordinal)
                    && p.Key is not ("vnp_SecureHash" or "vnp_SecureHashType")
                    && !string.IsNullOrEmpty(p.Value))
                .OrderBy(p => p.Key, StringComparer.Ordinal)
                .Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

        parameters.TryGetValue("vnp_SecureHash", out var receivedHash);
        var signatureValid = !string.IsNullOrEmpty(receivedHash)
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(Sign(signedData)),
                Encoding.UTF8.GetBytes(receivedHash.ToLowerInvariant()));

        if (!signatureValid)
            return new PaymentGatewayCallback(false, string.Empty, null, false);

        decimal? amount = long.TryParse(
            parameters.GetValueOrDefault("vnp_Amount"), NumberStyles.None, CultureInfo.InvariantCulture, out var rawAmount)
            ? rawAmount / 100m
            : null;
        var success = parameters.GetValueOrDefault("vnp_ResponseCode") == "00"
            && parameters.GetValueOrDefault("vnp_TransactionStatus") == "00";

        return new PaymentGatewayCallback(true, parameters.GetValueOrDefault("vnp_TxnRef") ?? string.Empty, amount, success);
    }

    private string Sign(string data)
    {
        var hash = HMACSHA512.HashData(Encoding.UTF8.GetBytes(options.HashSecret), Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(options.TmnCode)
            || string.IsNullOrWhiteSpace(options.HashSecret)
            || string.IsNullOrWhiteSpace(options.ReturnUrl))
            throw new InvalidOperationException(
                "Thiếu biến môi trường Payment__Vnpay__TmnCode, Payment__Vnpay__HashSecret hoặc Payment__Vnpay__ReturnUrl.");
    }
}
