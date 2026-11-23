"use client";

import { useQueries } from "@tanstack/react-query";
import { listAppointmentPayments } from "@/lib/api/endpoints/appointments";
import type { Appointment, Payment } from "@/lib/api/types";
import { appointmentKeys, useAppointment, useAppointments } from "@/lib/queries/appointments";
import { sortByRowMoment } from "@/features/appointments/appointments";
import { dueKindOf, findDuePayment } from "./payments";

export type DueItem = { appointment: Appointment; payment: Payment };

/**
 * Danh sách “Khoản cần thu” (SW-09 vùng 1). Lễ tân không gọi được GET /payments (G-07) nên dựng từ lịch hôm nay: lịch nào
 * đang ở trạng thái có khoản đến hạn (`dueKindOf`) thì đọc GET /appointments/{id}/payments và giữ khoản Chưa thanh toán.
 * Lịch mở bằng `?appointmentId=` nhưng không thuộc hôm nay (khách đến thu tiền lưu trú sớm, phí trễ của lịch trả hôm qua…)
 * vẫn được thêm vào đầu danh sách.
 */
export function useDuePayments(today: string, selectedId: string | null) {
  // Cùng khóa với SW-02, SW-07 của lễ tân hôm nay nên chuyển qua lại giữa các màn không phải tải lại.
  const list = useAppointments({ date: today, sort: "time_asc", page: 1, pageSize: 100 });
  const todayItems = list.data ? sortByRowMoment(list.data.items, today) : [];
  const selectedOutsideToday =
    selectedId !== null && list.data !== undefined && !todayItems.some((item) => item.appointmentId === selectedId);
  const selected = useAppointment(selectedId ?? "", { enabled: selectedOutsideToday });

  const candidates = [
    ...(selectedOutsideToday && selected.data ? [selected.data] : []),
    ...todayItems,
  ].filter((appointment) => dueKindOf(appointment) !== null);

  const payments = useQueries({
    queries: candidates.map((appointment) => ({
      queryKey: appointmentKeys.payments(appointment.appointmentId),
      queryFn: () => listAppointmentPayments(appointment.appointmentId),
    })),
  });

  const items: DueItem[] = [];
  candidates.forEach((appointment, index) => {
    const payment = findDuePayment(appointment, payments[index]?.data);
    if (payment) items.push({ appointment, payment });
  });

  const paymentError = payments.find((query) => query.isError)?.error ?? null;
  return {
    items,
    /** Đang tải lần đầu: danh sách lịch, lịch ngoài hôm nay, hoặc khoản của một lịch nào đó. */
    isPending:
      list.isPending || (selectedOutsideToday && selected.isPending) || payments.some((query) => query.isPending),
    error: list.error ?? paymentError,
    retry: () => {
      void list.refetch();
      payments.forEach((query) => {
        if (query.isError) void query.refetch();
      });
    },
  };
}
