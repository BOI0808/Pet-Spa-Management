using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Domain.UnitTests;

internal sealed class FakeStayPaymentRepository : IPaymentRepository
{
    public List<Payment> Payments { get; } = [];

    public Task<PaymentWithAppointmentStatus?> FindWithAppointmentStatusAsync(
        Guid paymentId, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AppointmentStatus?> GetAppointmentStatusAsync(Guid appointmentId, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Payment>>(Payments.Where(p => p.AppointmentId == appointmentId).ToList());

    public Task<PagedResult<Payment>> ListAsync(
        PaymentStatus? status, int page, int pageSize, CancellationToken ct = default) =>
        throw new NotImplementedException();
}