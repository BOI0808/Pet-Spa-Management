using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Infrastructure.Persistence;
using PetSpa.Infrastructure.Persistence.Repositories;
using Xunit;

namespace PetSpa.Infrastructure.UnitTests;

public class AppointmentQueryTranslationTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=dummy")
            .Options;
        return new AppDbContext(options);
    }

    [Theory]
    [InlineData(AppointmentSort.TimeAsc)]
    [InlineData(AppointmentSort.TimeDesc)]
    [InlineData(AppointmentSort.CreatedAsc)]
    [InlineData(AppointmentSort.CreatedDesc)]
    public void DateFilterAndAllSortModes_TranslateToSql(AppointmentSort sort)
    {
        using var db = CreateDbContext();
        var timeZone = new ShopTimeZone(TimeZoneInfo.Utc);
        var date = new DateOnly(2026, 11, 14);

        var baseAppointments = AppointmentQueryHelper.FilterByDate(
            db.Set<Appointment>().AsNoTracking(), date, timeZone);

        var query = from a in baseAppointments
                    join c in db.Set<Customer>().AsNoTracking() on a.CustomerId equals c.CustomerId
                    join p in db.Set<Pet>().AsNoTracking() on a.PetId equals p.PetId
                    select new AppointmentQueryRow { Appointment = a, CustomerName = c.FullName, PetName = p.Name };

        var orderedQuery = AppointmentQueryHelper.ApplySort(query, sort);

        var sql = orderedQuery.ToQueryString();
        Assert.NotNull(sql);
        Assert.Contains("SlotStart", sql);
        Assert.Contains("PlannedCheckIn", sql);
    }

    [Fact]
    public void ResolveEffectiveSort_DefaultsCorrectly()
    {
        // 1. Explicit sort always wins
        Assert.Equal(AppointmentSort.CreatedAsc,
            AppointmentQueryHelper.ResolveEffectiveSort(AppointmentSort.CreatedAsc, new DateOnly(2026, 11, 14), AppointmentStatus.Completed));

        // 2. Date provided -> TimeAsc
        Assert.Equal(AppointmentSort.TimeAsc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, new DateOnly(2026, 11, 14), null));
        Assert.Equal(AppointmentSort.TimeAsc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, new DateOnly(2026, 11, 14), AppointmentStatus.Confirmed));

        // 3. Completed or Cancelled (History) without date -> TimeDesc
        Assert.Equal(AppointmentSort.TimeDesc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, null, AppointmentStatus.Completed));
        Assert.Equal(AppointmentSort.TimeDesc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, null, AppointmentStatus.Cancelled));

        // 4. Ongoing statuses without date -> TimeAsc
        Assert.Equal(AppointmentSort.TimeAsc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, null, AppointmentStatus.Confirmed));
        Assert.Equal(AppointmentSort.TimeAsc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, null, AppointmentStatus.InProgress));

        // 5. No date, no active status -> CreatedDesc
        Assert.Equal(AppointmentSort.CreatedDesc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, null, null));
        Assert.Equal(AppointmentSort.CreatedDesc,
            AppointmentQueryHelper.ResolveEffectiveSort(null, null, AppointmentStatus.Pending));
    }
}
