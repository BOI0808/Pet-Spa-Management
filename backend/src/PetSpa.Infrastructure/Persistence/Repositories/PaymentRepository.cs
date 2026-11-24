using Microsoft.EntityFrameworkCore;
using PetSpa.Application.Common;
using PetSpa.Application.Ports;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Repositories;

public sealed class PaymentRepository(AppDbContext db) : IPaymentRepository
{
    public async Task<PaymentWithAppointmentStatus?> FindWithAppointmentStatusAsync(
        Guid paymentId, CancellationToken ct = default)
    {
        var row = await (
            from p in db.Set<Payment>()
            join a in db.Set<Appointment>() on p.AppointmentId equals a.AppointmentId
            where p.PaymentId == paymentId
            select new { Payment = p, AppointmentStatus = a.Status })
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new PaymentWithAppointmentStatus(row.Payment, row.AppointmentStatus);
    }

    public async Task<AppointmentStatus?> GetAppointmentStatusAsync(Guid appointmentId, CancellationToken ct = default)
    {
        return await db.Set<Appointment>().AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => (AppointmentStatus?)a.Status)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<Payment>> ListByAppointmentAsync(Guid appointmentId, CancellationToken ct = default)
    {
        var items = await db.Set<Payment>().AsNoTracking()
            .Where(p => p.AppointmentId == appointmentId)
            .ToListAsync(ct);

        return items.OrderBy(p => p.Kind).ToList();
    }

    public async Task<PagedResult<Payment>> ListAsync(
        PaymentStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var payments = db.Set<Payment>().AsNoTracking();
        if (status is { } wantedStatus) payments = payments.Where(p => p.Status == wantedStatus);

        var query =
            from p in payments
            join a in db.Set<Appointment>().AsNoTracking() on p.AppointmentId equals a.AppointmentId
            orderby a.CreatedAt descending, p.PaymentId
            select p;

        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<Payment>(items, page, pageSize, total);
    }

    public void Add(Payment payment) =>
        db.Set<Payment>().Add(payment);

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);

    public async Task AddTransactionAsync(PaymentTransaction transaction, CancellationToken ct = default)
    {
        db.Set<PaymentTransaction>().Add(transaction);
        await db.SaveChangesAsync(ct);
    }

    public async Task<Guid?> FindPaymentIdByTxnRefAsync(string txnRef, CancellationToken ct = default)
    {
        return await db.Set<PaymentTransaction>().AsNoTracking()
            .Where(t => t.TxnRef == txnRef)
            .Select(t => (Guid?)t.PaymentId)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<PaymentTransaction?> FindTransactionByTxnRefAsync(string txnRef, CancellationToken ct = default)
    {
        return await db.Set<PaymentTransaction>().FirstOrDefaultAsync(t => t.TxnRef == txnRef, ct);
    }

    public Task UpdateStayAmountAsync(Guid appointmentId, decimal newAmount, CancellationToken ct = default) =>
        db.Set<Payment>()
            .Where(p => p.AppointmentId == appointmentId
                && p.Kind == PaymentKind.Stay
                && p.Status == PaymentStatus.Unpaid)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Amount, newAmount), ct);
}
