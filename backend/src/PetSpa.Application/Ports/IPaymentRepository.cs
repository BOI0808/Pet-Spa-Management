using PetSpa.Application.Common;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Application.Ports;

public sealed record PaymentWithAppointmentStatus(Payment Payment, AppointmentStatus AppointmentStatus);

public interface IPaymentRepository
{
    Task<PaymentWithAppointmentStatus?> FindWithAppointmentStatusAsync(Guid paymentId, CancellationToken ct = default);

    Task<AppointmentStatus?> GetAppointmentStatusAsync(Guid appointmentId, CancellationToken ct = default);

    Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default);

    Task<PagedResult<Payment>> ListAsync(PaymentStatus? status, int page, int pageSize, CancellationToken ct = default);

    Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default);

    Task<Guid?> FindPaymentIdByTxnRefAsync(string txnRef, CancellationToken ct = default);

    Task<PaymentTransaction?> FindTransactionByTxnRefAsync(string txnRef, CancellationToken ct = default);

    void Add(Payment payment);

    Task SaveChangesAsync(CancellationToken ct = default);

    // Cập nhật số tiền khoản lưu trú chưa thanh toán (PaymentKind.Stay, PaymentStatus.Unpaid).
    Task UpdateStayAmountAsync(Guid appointmentId, decimal newAmount, CancellationToken ct = default);
}
