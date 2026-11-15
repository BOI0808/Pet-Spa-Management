using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using PetSpa.Application.Ports;

namespace PetSpa.Infrastructure.Storage;

public sealed class SupabasePhotoStorage(HttpClient http, StorageOptions options) : IPhotoStorage
{
    private const int SignedUrlSeconds = 3600;

    public async Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default)
    {
        var fileContent = new StreamContent(content);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"object/{options.Bucket}/{storageKey}")
        {
            Content = fileContent,
        };

        using var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<string> CreateTemporaryUrlAsync(string storageKey, CancellationToken ct = default)
    {
        using var response = await http.PostAsJsonAsync(
            $"object/sign/{options.Bucket}/{storageKey}", new { expiresIn = SignedUrlSeconds }, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<SignedUrlResponse>(ct);
        if (body is null || string.IsNullOrEmpty(body.SignedUrl))
            throw new InvalidOperationException("Supabase Storage không trả URL tạm thời.");

        return new Uri(http.BaseAddress!, body.SignedUrl.TrimStart('/')).ToString();
    }

    private sealed class SignedUrlResponse
    {
        [JsonPropertyName("signedURL")]
        public string SignedUrl { get; set; } = string.Empty;
    }
}
