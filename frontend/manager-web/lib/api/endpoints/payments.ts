import { apiClient } from "@/lib/api/client";
import type { PaymentPage, PaymentStatus } from "@/lib/api/types";

export type PaymentListParams = {
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
};

/**
 * GET /payments – chỉ Quản lý (FR-PAY-04). Lịch hẹn tạo mới nhất trước; mặc định page = 1, pageSize = 20, tối đa 100.
 * Chưa lọc được theo `kind`, `method` ở backend (UI-Screens G-07) nên MW-10 lọc hai trường này ở web.
 */
export async function listPayments(params: PaymentListParams = {}) {
  const { data } = await apiClient.get<PaymentPage>("/payments", { params });
  return data;
}
