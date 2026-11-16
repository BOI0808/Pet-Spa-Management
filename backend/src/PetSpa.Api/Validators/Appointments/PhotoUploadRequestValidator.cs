using System.Net.Http.Headers;
using FluentValidation;
using PetSpa.Api.Dtos;

namespace PetSpa.Api.Validators;

public sealed class PhotoUploadRequestValidator : AbstractValidator<PhotoUploadRequest>
{
    public const long MaxFileBytes = 50L * 1024 * 1024;

    public PhotoUploadRequestValidator()
    {
        RuleFor(x => x.Kind)
            .NotNull().WithMessage("Loại ảnh là bắt buộc (Before hoặc After).")
            .IsInEnum().WithMessage("Loại ảnh phải là Before hoặc After.");

        RuleFor(x => x.File)
            .NotNull().WithMessage("Tệp ảnh là bắt buộc.");

        When(x => x.File is not null, () =>
        {
            RuleFor(x => x.File!.Length)
                .GreaterThan(0).WithMessage("Tệp ảnh không được rỗng.")
                .LessThanOrEqualTo(MaxFileBytes).WithMessage("Tệp ảnh tối đa 50 MB.");

            RuleFor(x => x.File!.ContentType)
                .Must(IsImageContentType).WithMessage("Chỉ nhận tệp ảnh.");
        });
    }

    private static bool IsImageContentType(string? contentType) =>
        MediaTypeHeaderValue.TryParse(contentType, out var mediaType)
        && mediaType.MediaType is { } type
        && type.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
}
