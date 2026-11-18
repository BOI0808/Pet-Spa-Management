using PetSpa.Domain.Entities;
using Xunit;

namespace PetSpa.Domain.UnitTests;

public class AppointmentServiceProgressTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void UpdateProgress_Done_SetsIsDoneDoneAtAndTrimmedNote()
    {
        var line = new AppointmentService();

        line.UpdateProgress(true, "  Tắm xong  ", Now);

        Assert.True(line.IsDone);
        Assert.Equal(Now, line.DoneAt);
        Assert.Equal("Tắm xong", line.Note);
    }

    [Fact]
    public void UpdateProgress_AlreadyDone_PreservesOriginalDoneAt()
    {
        var line = new AppointmentService { IsDone = true, DoneAt = Now, Note = "Ghi chú cũ" };

        line.UpdateProgress(true, "Cập nhật ghi chú", Now.AddMinutes(30));

        Assert.True(line.IsDone);
        Assert.Equal(Now, line.DoneAt);
        Assert.Equal("Cập nhật ghi chú", line.Note);
    }

    [Fact]
    public void UpdateProgress_Undone_ClearsDoneAt()
    {
        var line = new AppointmentService { IsDone = true, DoneAt = Now };

        line.UpdateProgress(false, null, Now.AddHours(1));

        Assert.False(line.IsDone);
        Assert.Null(line.DoneAt);
    }

    [Fact]
    public void UpdateProgress_NullNote_KeepsOldNote()
    {
        var line = new AppointmentService { Note = "Ghi chú cũ" };

        line.UpdateProgress(true, null, Now);

        Assert.Equal("Ghi chú cũ", line.Note);
    }

    [Fact]
    public void UpdateProgress_BlankNote_ClearsNote()
    {
        var line = new AppointmentService { Note = "Ghi chú cũ" };

        line.UpdateProgress(true, "   ", Now);

        Assert.Null(line.Note);
    }
}
