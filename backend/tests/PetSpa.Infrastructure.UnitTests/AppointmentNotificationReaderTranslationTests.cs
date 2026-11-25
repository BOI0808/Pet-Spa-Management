using Microsoft.EntityFrameworkCore;
using PetSpa.Infrastructure.Persistence;
using PetSpa.Infrastructure.Persistence.Repositories;
using Xunit;

namespace PetSpa.Infrastructure.UnitTests;

public class AppointmentNotificationReaderTranslationTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=dummy")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public void BuildAppointmentQuery_TranslatesToSql()
    {
        using var db = CreateDbContext();

        var sql = AppointmentNotificationReader.BuildAppointmentQuery(db, Guid.NewGuid()).ToQueryString();

        Assert.NotNull(sql);
        Assert.Contains("SELECT", sql);
        Assert.Contains("JOIN", sql);
    }

    [Fact]
    public void BuildStaffUserIdsQuery_TranslatesToSql()
    {
        using var db = CreateDbContext();

        var sql = AppointmentNotificationReader.BuildStaffUserIdsQuery(db, Guid.NewGuid()).ToQueryString();

        Assert.NotNull(sql);
        Assert.Contains("DISTINCT", sql);
        Assert.Contains("UserId", sql);
    }
}
