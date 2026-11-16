using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class HotelAppointmentCageSuitabilityTests
{
    private static Cage CageOf(
        Species species = Species.Cat, SizeGroup sizeGroup = SizeGroup.Medium, bool isActive = true) => new()
    {
        CageId = Guid.NewGuid(),
        Code = "A1",
        Species = species,
        SizeGroup = sizeGroup,
        IsActive = isActive,
    };

    private static HotelAppointment StayWith(Cage? cage, SizeGroup sizeGroup = SizeGroup.Medium) => new()
    {
        AppointmentId = Guid.NewGuid(),
        Status = AppointmentStatus.Confirmed,
        SizeGroup = sizeGroup,
        CageId = cage?.CageId,
    };

    [Fact]
    public void IsCageSuitable_WhenSpeciesSizeAndActiveMatch_ReturnsTrue()
    {
        var cage = CageOf();
        var stay = StayWith(cage);

        Assert.True(stay.IsCageSuitable(cage, Species.Cat));
    }

    [Fact]
    public void IsCageSuitable_WhenSizeGroupDiffers_ReturnsFalse()
    {
        var cage = CageOf(sizeGroup: SizeGroup.Small);
        var stay = StayWith(cage, SizeGroup.Medium);

        Assert.False(stay.IsCageSuitable(cage, Species.Cat));
    }

    [Fact]
    public void IsCageSuitable_WhenSpeciesDiffers_ReturnsFalse()
    {
        var cage = CageOf(species: Species.Dog);
        var stay = StayWith(cage);

        Assert.False(stay.IsCageSuitable(cage, Species.Cat));
    }

    [Fact]
    public void IsCageSuitable_WhenCageInactive_ReturnsFalse()
    {
        var cage = CageOf(isActive: false);
        var stay = StayWith(cage);

        Assert.False(stay.IsCageSuitable(cage, Species.Cat));
    }

    [Fact]
    public void IsCageSuitable_WhenNoCageAssigned_ReturnsFalse()
    {
        var stay = StayWith(null);

        Assert.False(stay.IsCageSuitable(null, Species.Cat));
        Assert.False(stay.IsCageSuitable(CageOf(), Species.Cat));
    }

    [Fact]
    public void IsCageSuitable_WhenCageIsNotTheAssignedOne_ReturnsFalse()
    {
        var assigned = CageOf();
        var stay = StayWith(assigned);

        Assert.False(stay.IsCageSuitable(CageOf(), Species.Cat));
    }
}