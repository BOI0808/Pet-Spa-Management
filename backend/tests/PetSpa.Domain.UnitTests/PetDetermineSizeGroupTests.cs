using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class PetDetermineSizeGroupTests
{
    private static readonly List<SizeRule> StandardRules =
    [
        new() { Species = Species.Dog, Criterion = SizeCriterion.Weight, SmallUpper = 10m, MediumUpper = 25m },
        new() { Species = Species.Dog, Criterion = SizeCriterion.Height, SmallUpper = 35m, MediumUpper = 55m },
        new() { Species = Species.Cat, Criterion = SizeCriterion.Weight, SmallUpper = 3m, MediumUpper = 5m },
        new() { Species = Species.Rabbit, Criterion = SizeCriterion.Weight, SmallUpper = 1.5m, MediumUpper = 3m },
        new() { Species = Species.GuineaPig, Criterion = SizeCriterion.Weight, SmallUpper = 1.0m, MediumUpper = null }
    ];

    [Fact]
    public void Dog_WhenHeightIsNull_ThrowsValidationError()
    {
        var pet = new Pet
        {
            Species = Species.Dog,
            WeightKg = 8m,
            HeightCm = null
        };

        var ex = Assert.Throws<BusinessException>(() => pet.DetermineSizeGroup(StandardRules));
        Assert.Equal(ErrorCodes.ValidationError, ex.Code);
    }

    [Theory]
    [InlineData(9.99, 34.99, SizeGroup.Small)]
    [InlineData(10.0, 30.0, SizeGroup.Medium)]
    [InlineData(8.0, 35.0, SizeGroup.Medium)]
    [InlineData(24.99, 54.99, SizeGroup.Medium)]
    [InlineData(25.0, 30.0, SizeGroup.Large)]
    [InlineData(8.0, 55.0, SizeGroup.Large)]
    [InlineData(30.0, 60.0, SizeGroup.Large)]
    public void Dog_DeterminesSizeGroup_TakesHigherGroup(double weight, double height, SizeGroup expected)
    {
        var pet = new Pet
        {
            Species = Species.Dog,
            WeightKg = (decimal)weight,
            HeightCm = (decimal)height
        };

        pet.DetermineSizeGroup(StandardRules);

        Assert.Equal(expected, pet.SizeGroup);
    }

    [Theory]
    [InlineData(2.99, SizeGroup.Small)]
    [InlineData(3.0, SizeGroup.Medium)]
    [InlineData(4.99, SizeGroup.Medium)]
    [InlineData(5.0, SizeGroup.Large)]
    [InlineData(7.5, SizeGroup.Large)]
    public void Cat_DeterminesSizeGroup_ByWeightBoundaries(double weight, SizeGroup expected)
    {
        var pet = new Pet
        {
            Species = Species.Cat,
            WeightKg = (decimal)weight
        };

        pet.DetermineSizeGroup(StandardRules);

        Assert.Equal(expected, pet.SizeGroup);
    }

    [Theory]
    [InlineData(1.49, SizeGroup.Small)]
    [InlineData(1.5, SizeGroup.Medium)]
    [InlineData(2.99, SizeGroup.Medium)]
    [InlineData(3.0, SizeGroup.Large)]
    [InlineData(4.2, SizeGroup.Large)]
    public void Rabbit_DeterminesSizeGroup_ByWeightBoundaries(double weight, SizeGroup expected)
    {
        var pet = new Pet
        {
            Species = Species.Rabbit,
            WeightKg = (decimal)weight
        };

        pet.DetermineSizeGroup(StandardRules);

        Assert.Equal(expected, pet.SizeGroup);
    }

    [Theory]
    [InlineData(0.99, SizeGroup.Small)]
    [InlineData(1.0, SizeGroup.Large)]
    [InlineData(1.5, SizeGroup.Large)]
    public void GuineaPig_DeterminesSizeGroup_SmallOrLargeOnly(double weight, SizeGroup expected)
    {
        var pet = new Pet
        {
            Species = Species.GuineaPig,
            WeightKg = (decimal)weight
        };

        pet.DetermineSizeGroup(StandardRules);

        Assert.Equal(expected, pet.SizeGroup);
    }

    [Fact]
    public void DetermineSizeGroup_WhenRuleMissing_ThrowsInvalidOperationException()
    {
        var pet = new Pet
        {
            Species = Species.Dog,
            WeightKg = 10m,
            HeightCm = 40m
        };

        Assert.Throws<InvalidOperationException>(() => pet.DetermineSizeGroup([]));
    }
}
