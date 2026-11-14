using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Application.Security;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;
using PetSpa.Domain.Exceptions;
using PetSpa.Domain.Services;

namespace PetSpa.Application.Services.Booking;

public sealed class AppointmentChangeService(
    IAppointmentChangeRepository changes,
    IPetRepository pets,
    IBookingRepository bookings,
    IServiceCatalogRepository catalog,
    IHotelBookingRepository hotelBookings,
    IStoreTimeZoneProvider timeZoneProvider,
    ShopTimeZone shopTimeZone,
    IConcurrencyGuard concurrency,
    IAssignmentRepository assignments,
    IHotelAssignmentRepository hotelAssignments)
{
    public async Task<AppointmentStatus> CancelAsync(
        CurrentUser user, Guid appointmentId, CancelReason? reason = null, CancellationToken ct = default)
    {
        if (user.Role == UserRole.Manager)
            return await CancelByManagerAsync(appointmentId, reason, ct);

        return await CancelByCustomerAsync(user, appointmentId, ct);
    }

    private async Task<AppointmentStatus> CancelByManagerAsync(
        Guid appointmentId, CancelReason? reason, CancellationToken ct)
    {
        if (reason is not (CancelReason.StoreUnable or CancelReason.CustomerBeyondDeadline))
            throw new BusinessException(
                ErrorCodes.ValidationError, "Quản lý phải gửi lý do hủy là StoreUnable hoặc CustomerBeyondDeadline.");

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var fresh = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var appointment = fresh.Appointment;
            appointment.Cancel(reason.Value);

            if (appointment is SpaAppointment)
                await changes.ReleaseStaffHoldsAsync(appointmentId, ct);

            return appointment.Status;
        }, ct);
    }

    private async Task<AppointmentStatus> CancelByCustomerAsync(
        CurrentUser user, Guid appointmentId, CancellationToken ct)
    {
        EnsureCustomer(user);

        var found = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        var deadlineMinutes = await changes.GetChangeDeadlineMinutesAsync(ct);
        EnsureChangeAllowed(found.Appointment, deadlineMinutes);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var fresh = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            var appointment = fresh.Appointment;
            EnsureChangeAllowed(appointment, deadlineMinutes);

            appointment.Cancel(CancelReason.CustomerCancelled);

            if (appointment is SpaAppointment)
                await changes.ReleaseStaffHoldsAsync(appointmentId, ct);

            return appointment.Status;
        }, ct);
    }

    public async Task<AppointmentStatus> ChangeAsync(
        CurrentUser user, Guid appointmentId, AppointmentChangeInput input, CancellationToken ct = default)
    {
        var byManager = user.Role == UserRole.Manager;
        if (!byManager) EnsureCustomer(user);

        var found = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (!byManager) OwnershipGuard.EnsureOwner(user, found.OwnerUserId);

        var deadlineMinutes = byManager ? 0 : await changes.GetChangeDeadlineMinutesAsync(ct);
        var context = new ChangeContext(user, byManager, found.Appointment.CustomerId, deadlineMinutes);
        EnsureCanChange(found.Appointment, context);

        if (found.Appointment is SpaAppointment)
            return await ChangeSpaAsync(context, appointmentId, input, ct);

        if (found.Appointment is HotelAppointment)
            return await ChangeHotelAsync(context, appointmentId, input, ct);

        throw new BusinessException(ErrorCodes.NotFound);
    }

    private sealed record ChangeContext(CurrentUser User, bool ByManager, Guid CustomerId, int DeadlineMinutes);

    private async Task<AppointmentStatus> ChangeSpaAsync(
        ChangeContext context, Guid appointmentId, AppointmentChangeInput input, CancellationToken ct)
    {
        if (input.SlotStart is null || input.PetId is null || input.ServiceIds is null)
            throw new BusinessException(ErrorCodes.ValidationError, "Đổi lịch spa cần slotStart, petId và serviceIds.");

        var pet = await FindPetAsync(context, input.PetId.Value, ct);
        var plan = await PlanSpaAsync(pet, input.ServiceIds, ct);

        var slotStartUtc = input.SlotStart.Value.ToUniversalTime();
        if (slotStartUtc <= DateTimeOffset.UtcNow)
            throw new BusinessException(ErrorCodes.ValidationError, "Khung giờ mới phải ở tương lai.");

        var (day, time) = shopTimeZone.ToLocal(slotStartUtc);
        if (!(await catalog.GetSlotTimesAsync(ct)).Contains(time))
            throw new BusinessException(ErrorCodes.ValidationError, "slotStart phải đúng một mốc giờ đặt lịch của cửa hàng.");

        var slotEnd = slotStartUtc.AddMinutes(plan.DurationMinutes);
        var busyUntil = slotEnd.AddMinutes(plan.BufferMinutes);

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockSpaDayAsync(day, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var fresh = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (fresh.Appointment is not SpaAppointment spa)
                throw new BusinessException(ErrorCodes.NotFound);

            EnsureCanChange(spa, context);

            var shifts = await bookings.ListSpaStaffShiftsAsync(slotStartUtc, busyUntil, ct);
            var held = (await bookings.ListHeldBookingsAsync(slotStartUtc, busyUntil, ct)).ToList();

            held.Remove(new HeldBooking(spa.SlotStart, spa.BusyUntil, spa.StaffRequired));

            var status = SlotService.AvailableSlots(
                [new SlotCandidate(time, slotStartUtc)],
                plan.LatestStartTime, plan.DurationMinutes, plan.StaffRequired, plan.BufferMinutes, shifts, held)[0].Status;

            if (status != SlotStatus.Available) throw new BusinessException(ErrorCodes.SlotFull);

            if (context.ByManager)
            {
                spa.ChangeByManager(pet.PetId, pet.SizeGroup, slotStartUtc, slotEnd, busyUntil, (short)plan.StaffRequired);
                await changes.ReplaceServicesAsync(appointmentId, plan.ServiceIds, ct);

                if (spa.Status == AppointmentStatus.Confirmed)
                    await ReassignStaffAsync(spa, input, shifts, ct);

                return spa.Status;
            }

            spa.ChangeByCustomer(pet.PetId, pet.SizeGroup, slotStartUtc, slotEnd, busyUntil, (short)plan.StaffRequired);
            await changes.RemoveStaffAssignmentsAsync(appointmentId, ct);
            await changes.ReplaceServicesAsync(appointmentId, plan.ServiceIds, ct);

            return spa.Status;
        }, ct);
    }

    private async Task<AppointmentStatus> ChangeHotelAsync(
        ChangeContext context, Guid appointmentId, AppointmentChangeInput input, CancellationToken ct)
    {
        if (input.PetId is null || input.PlannedCheckIn is null || input.PlannedCheckOut is null)
            throw new BusinessException(
                ErrorCodes.ValidationError, "Đổi lịch lưu trú cần petId, plannedCheckIn và plannedCheckOut.");

        var checkInUtc = input.PlannedCheckIn.Value.ToUniversalTime();
        var checkOutUtc = input.PlannedCheckOut.Value.ToUniversalTime();

        if (checkInUtc <= DateTimeOffset.UtcNow)
            throw new BusinessException(ErrorCodes.ValidationError, "Thời điểm nhận phòng phải ở tương lai.");

        EnsureAtLeastOneNight(checkInUtc, checkOutUtc);

        var pet = await FindPetAsync(context, input.PetId.Value, ct);
        var storeTimeZone = timeZoneProvider.GetStoreTimeZone();

        return await concurrency.RunAsync(async () =>
        {
            await concurrency.LockHotelGroupAsync(pet.Species, pet.SizeGroup, ct);
            await concurrency.LockAppointmentAsync(appointmentId, ct);

            var fresh = await changes.FindWithOwnerAsync(appointmentId, asNoTracking: false, ct)
                ?? throw new BusinessException(ErrorCodes.NotFound);

            if (fresh.Appointment is not HotelAppointment stay)
                throw new BusinessException(ErrorCodes.NotFound);

            EnsureCanChange(stay, context);

            var activeCages = await hotelBookings.CountActiveCagesAsync(pet.Species, pet.SizeGroup, ct);
            var holdingStays = (await hotelBookings.ListHoldingStaysAsync(
                pet.Species, pet.SizeGroup, checkInUtc, checkOutUtc, ct))
                .Where(s => s.AppointmentId != appointmentId);

            if (HotelCapacityService.AvailableCages(activeCages, holdingStays, checkInUtc, checkOutUtc, storeTimeZone) < 1)
                throw new BusinessException(ErrorCodes.NoCapacity);

            if (context.ByManager)
            {
                stay.ChangeByManager(pet.PetId, pet.SizeGroup, checkInUtc, checkOutUtc);

                if (stay.Status == AppointmentStatus.Confirmed)
                    await ReassignCageAsync(stay, pet.Species, input.CageId, storeTimeZone, ct);

                return stay.Status;
            }

            stay.ChangeByCustomer(pet.PetId, pet.SizeGroup, checkInUtc, checkOutUtc);

            return stay.Status;
        }, ct);
    }

    private async Task ReassignStaffAsync(
        SpaAppointment spa, AppointmentChangeInput input, IReadOnlyList<StaffShift> shifts, CancellationToken ct)
    {
        var requestedIds = input.StaffIds is { Count: > 0 }
            ? input.StaffIds
            : await changes.ListHoldingStaffIdsAsync(spa.AppointmentId, ct);

        var chosenIds = requestedIds.Distinct().ToList();
        var assignmentRows = spa.ReplaceStaff(chosenIds);

        await changes.RemoveStaffAssignmentsAsync(spa.AppointmentId, ct);

        var names = await assignments.ListActiveSpaStaffNamesAsync(chosenIds, ct);
        if (names.Count != chosenIds.Count)
            throw new BusinessException(ErrorCodes.ValidationError, "Chỉ phân công nhân viên spa đang hoạt động.");

        var held = await assignments.ListHoldingAssignmentsAsync(spa.SlotStart, spa.BusyUntil, ct);
        if (held.Any(h => chosenIds.Contains(h.StaffId)))
            throw new BusinessException(ErrorCodes.StaffConflict);

        if (!input.ConfirmOutOfShift)
        {
            var outOfShift = SlotService.FindStaffOutOfShift(chosenIds, shifts, spa.SlotStart, spa.BusyUntil);
            if (outOfShift.Count > 0)
                throw new BusinessException(
                    ErrorCodes.StaffOutOfShift,
                    $"Nhân viên không có ca làm phủ khung giờ này: {string.Join(", ", outOfShift.Select(id => names[id]))}. "
                    + "Gửi confirmOutOfShift = true để vẫn đổi lịch.");
        }

        assignments.AddStaffAssignments(assignmentRows);
    }

    private async Task ReassignCageAsync(
        HotelAppointment stay, Species species, Guid? requestedCageId, TimeZoneInfo storeTimeZone, CancellationToken ct)
    {
        var cageId = requestedCageId ?? stay.CageId ?? throw new BusinessException(ErrorCodes.CageConflict);

        var cage = await hotelAssignments.FindCageAsync(cageId, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        var assignedStays = await hotelAssignments.ListAssignedStaysAsync(
            species, stay.SizeGroup, stay.PlannedCheckIn, stay.PlannedCheckOut, ct);

        if (HotelCapacityService.IsCageOccupied(
            cageId,
            assignedStays.Where(s => s.AppointmentId != stay.AppointmentId),
            stay.PlannedCheckIn,
            stay.PlannedCheckOut,
            storeTimeZone))
        {
            throw new BusinessException(ErrorCodes.CageConflict);
        }

        stay.ReplaceCage(cage, species);
    }

    private void EnsureAtLeastOneNight(DateTimeOffset checkIn, DateTimeOffset checkOut)
    {
        try
        {
            PricingService.CountNights(checkIn, checkOut, timeZoneProvider.GetStoreTimeZone());
        }
        catch (InvalidOperationException)
        {
            throw new BusinessException(ErrorCodes.ValidationError, "Ngày trả phải sau ngày nhận.");
        }
    }

    private async Task<Pet> FindPetAsync(ChangeContext context, Guid petId, CancellationToken ct)
    {
        var found = await pets.FindWithOwnerAsync(petId, asNoTracking: true, ct)
            ?? throw new BusinessException(ErrorCodes.NotFound);

        if (context.ByManager)
        {
            if (found.Pet.CustomerId != context.CustomerId)
                throw new BusinessException(ErrorCodes.ValidationError, "Thú cưng phải thuộc khách hàng của lịch hẹn.");
        }
        else
        {
            OwnershipGuard.EnsureOwner(context.User, found.OwnerUserId);
        }

        if (!found.Pet.IsActive) throw new BusinessException(ErrorCodes.NotFound);

        return found.Pet;
    }

    private sealed record SpaPlan(
        IReadOnlyList<Guid> ServiceIds, int DurationMinutes, int StaffRequired, TimeOnly LatestStartTime, int BufferMinutes);

    private async Task<SpaPlan> PlanSpaAsync(Pet pet, IReadOnlyList<Guid> serviceIds, CancellationToken ct)
    {
        var distinctIds = serviceIds.Distinct().ToList();
        var services = await bookings.FindBookableServicesAsync(distinctIds, pet.Species, pet.SizeGroup, ct);
        if (services.Count != distinctIds.Count)
            throw new BusinessException(
                ErrorCodes.ValidationError,
                "Có dịch vụ không tồn tại, đã ngừng cung cấp hoặc không áp dụng cho loài của thú cưng.");

        var duration = services.Sum(s => s.DurationMinutes);
        var staffRequired = SlotService.RequiredStaff(services.Select(s => s.StaffRequired), pet.Temperament);
        var latestStart = services.Min(s => s.LatestStartTime);
        var buffer = await bookings.GetBufferMinutesAsync(ct);

        return new SpaPlan(distinctIds, duration, staffRequired, latestStart, buffer);
    }

    private static void EnsureCustomer(CurrentUser user)
    {
        if (user.Role != UserRole.Customer) throw new BusinessException(ErrorCodes.Forbidden);
    }

    private static void EnsureCanChange(Appointment appointment, ChangeContext context)
    {
        if (context.ByManager)
            appointment.EnsureManagerCanChange();
        else
            EnsureChangeAllowed(appointment, context.DeadlineMinutes);
    }

    private static void EnsureChangeAllowed(Appointment appointment, int deadlineMinutes)
    {
        appointment.EnsureCustomerCanChange();

        var start = appointment switch
        {
            SpaAppointment spa => spa.SlotStart,
            HotelAppointment stay => stay.PlannedCheckIn,
            _ => throw new InvalidOperationException("Loại lịch hẹn không được hỗ trợ."),
        };

        if (start - DateTimeOffset.UtcNow < TimeSpan.FromMinutes(deadlineMinutes))
            throw new BusinessException(ErrorCodes.ChangeWindowClosed);
    }
}
