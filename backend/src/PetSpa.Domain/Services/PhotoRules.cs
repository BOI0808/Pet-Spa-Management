using PetSpa.Domain.Enums;

namespace PetSpa.Domain.Services;

public static class PhotoRules
{
    public static bool CanUpload(AppointmentStatus status, PhotoKind kind) =>
        kind switch
        {
            PhotoKind.Before => status == AppointmentStatus.Received,
            PhotoKind.After => status == AppointmentStatus.InProgress,
            _ => false,
        };

    public static bool IsBeforePhotoValid(DateTimeOffset? latestBeforeUploadedAt, DateTimeOffset now, int validityDays) =>
        latestBeforeUploadedAt is { } uploadedAt
        && uploadedAt <= now
        && uploadedAt >= now.AddDays(-validityDays);
}
