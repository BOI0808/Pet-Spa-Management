using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Assignment;

public sealed record AppointmentPhotoView(Guid PhotoId, PhotoKind Kind, string Url, DateTimeOffset UploadedAt);

public sealed class AppointmentPhotoService(
    IAppointmentQueryRepository appointments,
    IPhotoRepository photos,
    IPhotoStorage storage,
    IStaffRoleReader staffRoles,
    IConcurrencyGuard concurrencyGuard)
{
    public async Task<Guid> UploadAsync(
        CurrentUser user, Guid appointmentId, PhotoKind kind, Stream content, string contentType,
        CancellationToken ct = default)
    {
        if (user.Role != UserRole.Staff
            || await staffRoles.GetStaffRoleAsync(user.UserId, ct) != StaffRole.SpaStaff)
            throw new BusinessException(ErrorCodes.Forbidden);

        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (!await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
            throw new BusinessException(ErrorCodes.Forbidden);

        EnsureCanUpload(detail.Appointment.Status, kind);

        var staffId = await photos.FindStaffIdByUserIdAsync(user.UserId, ct)
            ?? throw new BusinessException(ErrorCodes.Forbidden);

        var photoId = Guid.NewGuid();
        var storageKey = $"appointments/{appointmentId}/{photoId}";

        await storage.UploadAsync(storageKey, content, contentType, ct);

        await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockAppointmentAsync(appointmentId, ct);

            var current = await appointments.FindDetailAsync(appointmentId, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);
            EnsureCanUpload(current.Appointment.Status, kind);

            photos.Add(new AppointmentPhoto
            {
                PhotoId = photoId,
                AppointmentId = appointmentId,
                Kind = kind,
                StorageKey = storageKey,
                UploadedByStaffId = staffId,
                UploadedAt = DateTimeOffset.UtcNow,
            });
        }, ct);

        return photoId;
    }

    public async Task<IReadOnlyList<AppointmentPhotoView>> ListAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct = default)
    {
        var detail = await appointments.FindDetailAsync(appointmentId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        switch (user.Role)
        {
            case UserRole.Customer:
                OwnershipGuard.EnsureOwner(user, detail.OwnerUserId);
                break;
            case UserRole.Manager:
                break;
            case UserRole.Staff:
                if (await staffRoles.GetStaffRoleAsync(user.UserId, ct) != StaffRole.SpaStaff
                    || !await appointments.IsAssignedToSpaStaffAsync(appointmentId, user.UserId, ct))
                    throw new BusinessException(ErrorCodes.Forbidden);
                break;
            default:
                throw new BusinessException(ErrorCodes.Forbidden);
        }

        var items = await photos.ListByAppointmentAsync(appointmentId, ct);
        var views = new List<AppointmentPhotoView>(items.Count);
        foreach (var photo in items)
        {
            var url = await storage.CreateTemporaryUrlAsync(photo.StorageKey, ct);
            views.Add(new AppointmentPhotoView(photo.PhotoId, photo.Kind, url, photo.UploadedAt));
        }

        return views;
    }

    public async Task EnsureValidBeforePhotoAsync(Guid petId, CancellationToken ct = default)
    {
        var latest = await photos.FindLatestBeforeUploadedAtAsync(petId, ct);
        var validityDays = await photos.GetValidityDaysAsync(ct);

        if (!PhotoRules.IsBeforePhotoValid(latest, DateTimeOffset.UtcNow, validityDays))
            throw new BusinessException(ErrorCodes.PhotoRequired);
    }

    private static void EnsureCanUpload(AppointmentStatus status, PhotoKind kind)
    {
        if (!PhotoRules.CanUpload(status, kind))
            throw new BusinessException(ErrorCodes.InvalidTransition);
    }
}
