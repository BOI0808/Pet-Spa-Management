using PetSpa.Domain.Enums;

namespace PetSpa.Application.Security;

public sealed record CurrentUser(Guid UserId, UserRole Role);