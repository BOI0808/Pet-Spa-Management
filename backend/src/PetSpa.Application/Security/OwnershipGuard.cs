using PetSpa.Domain.Exceptions;

namespace PetSpa.Application.Security;

public static class OwnershipGuard
{

    public static void EnsureOwner(CurrentUser user, Guid? ownerUserId)
    {
        if (ownerUserId is null || ownerUserId.Value != user.UserId)
            throw new BusinessException(ErrorCodes.Forbidden);
    }
}