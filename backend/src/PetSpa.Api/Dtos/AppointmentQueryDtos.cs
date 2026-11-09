using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Api.Dtos;

public sealed record CostConfirmationResponse(
    decimal ActualWeightKg,
    SizeGroup NewSizeGroup,
    long OldAmount,
    long NewAmount,
    ConfirmationStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? RespondedAt);

public sealed record AppointmentServiceItemResponse(
    Guid ServiceId, string Name, bool IsDone, DateTimeOffset? DoneAt, string? Note);

public sealed record AppointmentStaffItemResponse(
    Guid StaffId, string FullName, bool IsHolding, DateTimeOffset AssignedAt);

// Chi tiết lịch hẹn (khớp schema AppointmentDetail trong openapi): các trường của lịch hẹn, thêm services, staff, pendingCostConfirmation.
public sealed record AppointmentDetailResponse(
    Guid AppointmentId,
    AppointmentType Type,
    Guid CustomerId,
    Guid PetId,
    string CustomerName,
    string PetName,
    AppointmentStatus Status,
    CancelReason? CancelReason,
    DateTimeOffset? CancelledAt,
    SizeGroup SizeGroup,
    decimal? ActualWeightKg,
    DateTimeOffset? SlotStart,
    DateTimeOffset? SlotEnd,
    int? StaffRequired,
    DateTimeOffset? PlannedCheckIn,
    DateTimeOffset? PlannedCheckOut,
    DateTimeOffset? ActualCheckOut,
    Guid? CageId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<AppointmentServiceItemResponse> Services,
    IReadOnlyList<AppointmentStaffItemResponse> Staff,
    CostConfirmationResponse? PendingCostConfirmation)
{
    public static AppointmentDetailResponse From(AppointmentDetailData data)
    {
        var a = data.Appointment;
        var pendingCost = data.PendingCostConfirmation is not null
            ? new CostConfirmationResponse(
                data.PendingCostConfirmation.ActualWeightKg,
                data.PendingCostConfirmation.NewSizeGroup,
                (long)data.PendingCostConfirmation.OldAmount,
                (long)data.PendingCostConfirmation.NewAmount,
                data.PendingCostConfirmation.Status,
                data.PendingCostConfirmation.CreatedAt,
                data.PendingCostConfirmation.ExpiresAt,
                data.PendingCostConfirmation.RespondedAt)
            : null;

        return new AppointmentDetailResponse(
            a.AppointmentId,
            a.Type,
            a.CustomerId,
            a.PetId,
            a.CustomerName,
            a.PetName,
            a.Status,
            a.CancelReason,
            a.CancelledAt,
            a.SizeGroup,
            a.ActualWeightKg,
            a.SlotStart,
            a.SlotEnd,
            a.StaffRequired,
            a.PlannedCheckIn,
            a.PlannedCheckOut,
            a.ActualCheckOut,
            a.CageId,
            a.CreatedAt,
            a.UpdatedAt,
            data.Services.Select(s => new AppointmentServiceItemResponse(s.ServiceId, s.Name, s.IsDone, s.DoneAt, s.Note)).ToList(),
            data.Staff.Select(s => new AppointmentStaffItemResponse(s.StaffId, s.FullName, s.IsHolding, s.AssignedAt)).ToList(),
            pendingCost);
    }
}
