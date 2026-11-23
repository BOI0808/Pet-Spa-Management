namespace PetSpa.Api.Security;

// Cấu hình tác vụ nền: Jobs__Secret là giá trị header X-Job-Secret mà cron-job.org gửi kèm.
public sealed class JobsOptions
{
    public string Secret { get; set; } = string.Empty;
}
