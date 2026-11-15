using PetSpa.Domain.Enums;
using PetSpa.Domain.Services;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PhotoRulesTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 9, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(AppointmentStatus.Received, PhotoKind.Before, true)]
    [InlineData(AppointmentStatus.InProgress, PhotoKind.After, true)]
    [InlineData(AppointmentStatus.Received, PhotoKind.After, false)]
    [InlineData(AppointmentStatus.InProgress, PhotoKind.Before, false)]
    [InlineData(AppointmentStatus.Confirmed, PhotoKind.Before, false)]
    [InlineData(AppointmentStatus.Completed, PhotoKind.After, false)]
    public void CanUpload_FollowsStatusAndKind(AppointmentStatus status, PhotoKind kind, bool expected)
    {
        Assert.Equal(expected, PhotoRules.CanUpload(status, kind));
    }

    [Fact]
    public void IsBeforePhotoValid_WhenNoPhoto_ReturnsFalse()
    {
        Assert.False(PhotoRules.IsBeforePhotoValid(null, Now, 7));
    }

    [Fact]
    public void IsBeforePhotoValid_WhenUploadedWithinValidity_ReturnsTrue()
    {
        Assert.True(PhotoRules.IsBeforePhotoValid(Now.AddDays(-3), Now, 7));
    }

    [Fact]
    public void IsBeforePhotoValid_WhenExactlySevenDaysOld_ReturnsTrue()
    {
        Assert.True(PhotoRules.IsBeforePhotoValid(Now.AddDays(-7), Now, 7));
    }

    [Fact]
    public void IsBeforePhotoValid_WhenOlderThanSevenDays_ReturnsFalse()
    {
        Assert.False(PhotoRules.IsBeforePhotoValid(Now.AddDays(-7).AddSeconds(-1), Now, 7));
    }

    [Fact]
    public void IsBeforePhotoValid_WhenUploadedAfterNow_ReturnsFalse()
    {
        Assert.False(PhotoRules.IsBeforePhotoValid(Now.AddMinutes(1), Now, 7));
    }

    [Fact]
    public void IsBeforePhotoValid_UsesGivenValidityDays()
    {
        Assert.False(PhotoRules.IsBeforePhotoValid(Now.AddDays(-3), Now, 2));
        Assert.True(PhotoRules.IsBeforePhotoValid(Now.AddDays(-3), Now, 3));
    }
}
