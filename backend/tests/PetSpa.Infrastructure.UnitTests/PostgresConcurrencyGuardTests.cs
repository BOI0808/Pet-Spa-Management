using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PetSpa.Application.Ports;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Infrastructure;
using PetSpa.Infrastructure.Persistence;

namespace PetSpa.Infrastructure.UnitTests;

public class PostgresConcurrencyGuardTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=dummy")
            .Options;
        return new AppDbContext(options);
    }

    private static PostgresException CreatePostgresException(string sqlState, string? constraintName = null)
    {
        return new PostgresException(
            messageText: "Test database error",
            severity: "ERROR",
            invariantSeverity: "ERROR",
            sqlState: sqlState,
            constraintName: constraintName);
    }

    [Fact]
    public async Task LockSpaDayAsync_OutsideTransaction_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var guard = new PostgresConcurrencyGuard(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            guard.LockSpaDayAsync(new DateOnly(2026, 11, 3)));

        Assert.Contains("IConcurrencyGuard.RunAsync", ex.Message);
    }

    [Fact]
    public async Task LockHotelGroupAsync_OutsideTransaction_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var guard = new PostgresConcurrencyGuard(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            guard.LockHotelGroupAsync(Species.Dog, SizeGroup.Medium));

        Assert.Contains("IConcurrencyGuard.RunAsync", ex.Message);
    }

    [Fact]
    public async Task LockAppointmentAsync_OutsideTransaction_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var guard = new PostgresConcurrencyGuard(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            guard.LockAppointmentAsync(Guid.NewGuid()));

        Assert.Contains("IConcurrencyGuard.RunAsync", ex.Message);
    }

    [Fact]
    public async Task LockPaymentAsync_OutsideTransaction_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var guard = new PostgresConcurrencyGuard(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            guard.LockPaymentAsync(Guid.NewGuid()));

        Assert.Contains("IConcurrencyGuard.RunAsync", ex.Message);
    }

    [Fact]
    public void ToBusinessCode_DirectExclusionViolation_StaffBusy_ReturnsStaffConflict()
    {
        var pg = CreatePostgresException(PostgresErrorCodes.ExclusionViolation, "ex_staff_busy");

        var code = PostgresConcurrencyGuard.ToBusinessCode(pg);

        Assert.Equal(ErrorCodes.StaffConflict, code);
    }

    [Fact]
    public void ToBusinessCode_DirectExclusionViolation_CageNight_ReturnsCageConflict()
    {
        var pg = CreatePostgresException(PostgresErrorCodes.ExclusionViolation, "ex_cage_night");

        var code = PostgresConcurrencyGuard.ToBusinessCode(pg);

        Assert.Equal(ErrorCodes.CageConflict, code);
    }

    [Fact]
    public void ToBusinessCode_WrappedInDbUpdateException_ReturnsConflict()
    {
        var pg = CreatePostgresException(PostgresErrorCodes.ExclusionViolation, "ex_staff_busy");
        var dbEx = new DbUpdateException("Error saving", pg);

        var code = PostgresConcurrencyGuard.ToBusinessCode(dbEx);

        Assert.Equal(ErrorCodes.StaffConflict, code);
    }

    [Fact]
    public void ToBusinessCode_DeeplyNestedInAggregateException_ReturnsConflict()
    {
        var pg = CreatePostgresException(PostgresErrorCodes.ExclusionViolation, "ex_cage_night");
        var customLevel1 = new InvalidOperationException("Layer 1", pg);
        var customLevel2 = new ApplicationException("Layer 2", customLevel1);
        var aggregate = new AggregateException("Batch error", customLevel2);

        var code = PostgresConcurrencyGuard.ToBusinessCode(aggregate);

        Assert.Equal(ErrorCodes.CageConflict, code);
    }

    [Fact]
    public void ToBusinessCode_OtherSqlState_ReturnsNull()
    {
        var pg = CreatePostgresException(PostgresErrorCodes.UniqueViolation, "ex_staff_busy");

        var code = PostgresConcurrencyGuard.ToBusinessCode(pg);

        Assert.Null(code);
    }

    [Fact]
    public void ToBusinessCode_OtherConstraint_ReturnsNull()
    {
        var pg = CreatePostgresException(PostgresErrorCodes.ExclusionViolation, "other_constraint");

        var code = PostgresConcurrencyGuard.ToBusinessCode(pg);

        Assert.Null(code);
    }

    [Fact]
    public void ToBusinessCode_StandardException_ReturnsNull()
    {
        var ex = new InvalidOperationException("General error");

        var code = PostgresConcurrencyGuard.ToBusinessCode(ex);

        Assert.Null(code);
    }

    [Fact]
    public void DependencyInjection_RegistersIConcurrencyGuard_AsScopedPostgresConcurrencyGuard()
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost;Database=dummy",
            ["Jwt:SigningKey"] = "12345678901234567890123456789012",
            ["Jwt:AccessTokenMinutes"] = "15",
            ["Jwt:RefreshTokenDays"] = "7"
        }).Build();

        services.AddInfrastructure(config);

        var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IConcurrencyGuard));

        Assert.NotNull(descriptor);
        Assert.Equal(ServiceLifetime.Scoped, descriptor.Lifetime);
        Assert.Equal(typeof(PostgresConcurrencyGuard), descriptor.ImplementationType);
    }
}

