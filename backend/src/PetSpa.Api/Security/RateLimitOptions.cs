namespace PetSpa.Api.Security;

public sealed class RateLimitOptions
{
    public int AuthPermitPerMinute { get; set; }
    public int BookingPermitPerMinute { get; set; }
}