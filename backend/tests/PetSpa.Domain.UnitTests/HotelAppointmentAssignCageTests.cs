using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelAppointmentAssignCageTests
{
    private static HotelAppointment Stay(AppointmentStatus status = AppointmentStatus.Pending) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = status,
        SizeGroup = SizeGroup.Small,
    };

    private static Cage CageOf(
        Species species = Species.Dog, SizeGroup sizeGroup = SizeGroup.Small, bool isActive = true) => new()
    {
        CageId = Guid.NewGuid(),
        Code = "A1",
        Species = species,
        SizeGroup = sizeGroup,
        IsActive = isActive,
    };

    private static void AssertCode(string expected, Action action)
    {
        var ex = Assert.Throws<BusinessException>(action);
        Assert.Equal(expected, ex.Code);
    }

    [Fact]
    public void AssignCage_WhenPendingAndCageMatches_ConfirmsAndSetsCageId()
    {
        var stay = Stay();
        var cage = CageOf();

        stay.AssignCage(cage, Species.Dog);

        Assert.Equal(AppointmentStatus.Confirmed, stay.Status);
        Assert.Equal(cage.CageId, stay.CageId);
    }

    [Theory]
    [InlineData(AppointmentStatus.Confirmed)]
    [InlineData(AppointmentStatus.InStay)]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.Cancelled)]
    public void AssignCage_WhenNotPending_ThrowsInvalidTransition(AppointmentStatus status)
    {
        var stay = Stay(status);

        AssertCode(ErrorCodes.InvalidTransition, () => stay.AssignCage(CageOf(), Species.Dog));
        Assert.Null(stay.CageId);
    }

    [Fact]
    public void AssignCage_WhenCageInactive_ThrowsCageConflict()
    {
        var stay = Stay();

        AssertCode(ErrorCodes.CageConflict, () => stay.AssignCage(CageOf(isActive: false), Species.Dog));
        Assert.Equal(AppointmentStatus.Pending, stay.Status);
        Assert.Null(stay.CageId);
    }

    [Fact]
    public void AssignCage_WhenSpeciesDiffers_ThrowsCageConflict()
    {
        var stay = Stay();

        AssertCode(ErrorCodes.CageConflict, () => stay.AssignCage(CageOf(species: Species.Cat), Species.Dog));
        Assert.Equal(AppointmentStatus.Pending, stay.Status);
    }

    [Fact]
    public void AssignCage_WhenSizeGroupDiffers_ThrowsCageConflict()
    {
        var stay = Stay();

        AssertCode(ErrorCodes.CageConflict, () => stay.AssignCage(CageOf(sizeGroup: SizeGroup.Large), Species.Dog));
        Assert.Equal(AppointmentStatus.Pending, stay.Status);
    }
}