using System.Net;
using System.Security.Cryptography;
using System.Text;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Payments;

namespace PetSpa.Infrastructure.UnitTests;

public class VnpayPaymentGatewayTests
{
    private const string HashSecret = "TESTSECRET";
    private const string SecureHashMarker = "&vnp_SecureHash=";

    private static VnpayPaymentGateway CreateGateway() => new(new VnpayOptions
    {
        TmnCode = "TESTCODE",
        HashSecret = HashSecret,
        ReturnUrl = "http://localhost:3002",
    });

    private static PaymentGatewayRequest CreateRequest() => new(
        "abc123",
        300_000m,
        "Thanh toan lich hen spa abc123",
        "127.0.0.1",
        new DateTimeOffset(2026, 11, 20, 3, 0, 0, TimeSpan.Zero));

    private static string QueryOf(string url) => url[(url.IndexOf('?') + 1)..];

    private static Dictionary<string, string> ParseQuery(string url) =>
        QueryOf(url).Split('&')
            .Select(pair => pair.Split('=', 2))
            .ToDictionary(parts => parts[0], parts => WebUtility.UrlDecode(parts[1]));

    [Fact]
    public void Gateway_IsVnpay()
    {
        Assert.Equal(PaymentGateway.VNPAY, CreateGateway().Gateway);
    }

    [Fact]
    public void CreatePaymentUrl_UsesSandboxUrlAndMultipliesAmountByHundred()
    {
        var url = CreateGateway().CreatePaymentUrl(CreateRequest());

        Assert.StartsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?", url);

        var parameters = ParseQuery(url);
        Assert.Equal("30000000", parameters["vnp_Amount"]);
        Assert.Equal("abc123", parameters["vnp_TxnRef"]);
        Assert.Equal("TESTCODE", parameters["vnp_TmnCode"]);
        Assert.Equal("Thanh toan lich hen spa abc123", parameters["vnp_OrderInfo"]);
        Assert.Equal("http://localhost:3002", parameters["vnp_ReturnUrl"]);
        Assert.Equal("127.0.0.1", parameters["vnp_IpAddr"]);
    }

    [Fact]
    public void CreatePaymentUrl_FormatsDatesInVietnamTimeAndExpiresAfterFifteenMinutes()
    {
        var parameters = ParseQuery(CreateGateway().CreatePaymentUrl(CreateRequest()));

        Assert.Equal("20261120100000", parameters["vnp_CreateDate"]);
        Assert.Equal("20261120101500", parameters["vnp_ExpireDate"]);
    }

    [Fact]
    public void CreatePaymentUrl_SignsSortedQueryWithHmacSha512()
    {
        var query = QueryOf(CreateGateway().CreatePaymentUrl(CreateRequest()));

        var markerIndex = query.IndexOf(SecureHashMarker, StringComparison.Ordinal);
        Assert.True(markerIndex > 0);

        var signedData = query[..markerIndex];
        var names = signedData.Split('&').Select(pair => pair.Split('=', 2)[0]).ToList();
        Assert.Equal(names.OrderBy(name => name, StringComparer.Ordinal), names);

        var expectedHash = Convert.ToHexString(
            HMACSHA512.HashData(Encoding.UTF8.GetBytes(HashSecret), Encoding.UTF8.GetBytes(signedData)))
            .ToLowerInvariant();
        Assert.Equal(expectedHash, query[(markerIndex + SecureHashMarker.Length)..]);
    }

    [Fact]
    public void CreatePaymentUrl_WhenNotConfigured_ThrowsInvalidOperationException()
    {
        var gateway = new VnpayPaymentGateway(new VnpayOptions());

        Assert.Throws<InvalidOperationException>(() => gateway.CreatePaymentUrl(CreateRequest()));
    }
}
