namespace PetSpa.Application.Ports;

public interface IPhotoStorage
{
    Task UploadAsync(string storageKey, Stream content, string contentType, CancellationToken ct = default);

    Task<string> CreateTemporaryUrlAsync(string storageKey, CancellationToken ct = default);
}
