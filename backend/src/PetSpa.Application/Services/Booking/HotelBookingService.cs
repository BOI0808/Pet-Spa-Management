using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed class HotelBookingService(
    IPetRepository pets,
    IHotelBookingRepository bookings,
    IHotelCatalogRepository hotelCatalog,
    IStaffRoleReader staffRoles,
    IStoreTimeZoneProvider timeZoneProvider,
    IConcurrencyGuard concurrencyGuard)
{
    private enum BookingActor
    {
        Customer,
        Receptionist,
        Manager,
    }

    public async Task<HotelAvailabilityResult> CheckAvailabilityAsync(
        CurrentUser user, Guid petId, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct = default)
    {
        var checkInUtc = checkIn.ToUniversalTime();
        var checkOutUtc = checkOut.ToUniversalTime();

        if (checkInUtc <= DateTimeOffset.UtcNow)
            throw new BusinessException(ErrorCodes.ValidationError, "Thời điểm nhận phòng phải ở tương lai.");

        var actor = await ResolveActorAsync(user, ct);
        var pet = await FindPetAsync(user, actor, petId, ct);

        var nights = CountNights(checkInUtc, checkOutUtc);
        var estimatedAmount = await EstimateAmountAsync(pet, nights, ct);
        var available = await HasCapacityAsync(pet.Species, pet.SizeGroup, checkInUtc, checkOutUtc, ct);

        return new HotelAvailabilityResult(available, nights, estimatedAmount);
    }

    public async Task<HotelBookingResult> CreateAsync(
        CurrentUser user, HotelBookingInput input, Guid? requestedCustomerId, CancellationToken ct = default)
    {
        var checkInUtc = input.PlannedCheckIn.ToUniversalTime();
        var checkOutUtc = input.PlannedCheckOut.ToUniversalTime();

        if (checkInUtc <= DateTimeOffset.UtcNow)
            throw new BusinessException(ErrorCodes.ValidationError, "Thời điểm nhận phòng phải ở tương lai.");

        var actor = await ResolveActorAsync(user, ct);
        if (actor == BookingActor.Manager)
            throw new BusinessException(ErrorCodes.Forbidden);

        var pet = await FindPetAsync(user, actor, input.PetId, ct);

        if (actor == BookingActor.Receptionist)
        {
            if (requestedCustomerId is null || requestedCustomerId == Guid.Empty)
                throw new BusinessException(ErrorCodes.ValidationError, "Lễ tân phải chọn khách hàng (customerId).");

            if (pet.CustomerId != requestedCustomerId)
                throw new BusinessException(ErrorCodes.ValidationError, "Thú cưng không thuộc khách hàng đã chọn.");
        }
        else if (await bookings.IsCustomerBookingLockedAsync(pet.CustomerId, ct))
        {
            throw new BusinessException(ErrorCodes.BookingLocked);
        }

        var nights = CountNights(checkInUtc, checkOutUtc);
        var estimatedAmount = await EstimateAmountAsync(pet, nights, ct);

        var appointmentId = await concurrencyGuard.RunAsync(async () =>
        {
            await concurrencyGuard.LockHotelGroupAsync(pet.Species, pet.SizeGroup, ct);

            if (!await HasCapacityAsync(pet.Species, pet.SizeGroup, checkInUtc, checkOutUtc, ct))
                throw new BusinessException(ErrorCodes.NoCapacity);

            var appointment = new HotelAppointment
            {
                AppointmentId = Guid.NewGuid(),
                CustomerId = pet.CustomerId,
                PetId = pet.PetId,
                SizeGroup = pet.SizeGroup,
                PlannedCheckIn = checkInUtc,
                PlannedCheckOut = checkOutUtc,
            };
            bookings.Add(appointment);

            return appointment.AppointmentId;
        }, ct);

        return new HotelBookingResult(appointmentId, AppointmentStatus.Pending, nights, estimatedAmount);
    }

    private async Task<BookingActor> ResolveActorAsync(CurrentUser user, CancellationToken ct)
    {
        switch (user.Role)
        {
            case UserRole.Customer:
                return BookingActor.Customer;
            case UserRole.Manager:
                return BookingActor.Manager;
            case UserRole.Staff:
                var staffRole = await staffRoles.GetStaffRoleAsync(user.UserId, ct);
                return staffRole == StaffRole.Receptionist
                    ? BookingActor.Receptionist
                    : throw new BusinessException(ErrorCodes.Forbidden);
            default:
                throw new BusinessException(ErrorCodes.Forbidden);
        }
    }

    private async Task<Pet> FindPetAsync(CurrentUser user, BookingActor actor, Guid petId, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(petId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (!found.Pet.IsActive)
            throw new BusinessException(ErrorCodes.NotFound);

        if (actor == BookingActor.Customer)
            OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        return found.Pet;
    }

    private int CountNights(DateTimeOffset checkIn, DateTimeOffset checkOut)
    {
        if (checkOut <= checkIn)
        {
            throw new BusinessException(ErrorCodes.ValidationError, "Ngày trả phải sau ngày nhận.");
        }

        try
        {
            return PricingService.CountNights(checkIn, checkOut, timeZoneProvider.GetStoreTimeZone());
        }
        catch (InvalidOperationException)
        {
            throw new BusinessException(ErrorCodes.ValidationError, "Ngày trả phải sau ngày nhận.");
        }
    }

    private async Task<decimal> EstimateAmountAsync(Pet pet, int nights, CancellationToken ct)
    {
        var pricing = await hotelCatalog.GetPricingAsync(ct);
        return PricingService.CalculateStayAmount(nights, pet.Species, pet.SizeGroup, pricing.Pricing);
    }

    private async Task<bool> HasCapacityAsync(
        Species species, SizeGroup sizeGroup, DateTimeOffset checkIn, DateTimeOffset checkOut, CancellationToken ct)
    {
        var activeCages = await bookings.CountActiveCagesAsync(species, sizeGroup, ct);
        var holdingStays = await bookings.ListHoldingStaysAsync(species, sizeGroup, checkIn, checkOut, ct);

        return HotelCapacityService.AvailableCages(
            activeCages, holdingStays, checkIn, checkOut, timeZoneProvider.GetStoreTimeZone()) >= 1;
    }
}
