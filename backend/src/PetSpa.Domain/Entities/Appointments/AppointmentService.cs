namespace PetSpa.Domain.Entities;

public class AppointmentService
{
    public Guid AppointmentId { get; set; }
    public Guid ServiceId { get; set; }
    public bool IsDone { get; set; }
    public DateTimeOffset? DoneAt { get; set; }
    public string? Note { get; set; }

    public void UpdateProgress(bool isDone, string? note, DateTimeOffset now)
    {
        IsDone = isDone;
        DoneAt = isDone ? DoneAt ?? now : null;

        if (note is not null)
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    }
}