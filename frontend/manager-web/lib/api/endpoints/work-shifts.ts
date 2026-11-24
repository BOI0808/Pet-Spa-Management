import { apiClient } from "@/lib/api/client";
import type { WorkShiftPage } from "@/lib/api/types";

export type WorkShiftListParams = {
  /** Đầu khoảng, ISO 8601 có múi giờ (`toStoreIso`). */
  from?: string;
  /** Cuối khoảng, ISO 8601 có múi giờ. */
  to?: string;
  page?: number;
  pageSize?: number;
};

/** GET /work-shifts – chỉ Quản lý. Lấy các ca giao với khoảng [from, to], sắp theo giờ bắt đầu; `pageSize` tối đa 100. */
export async function listWorkShifts(params: WorkShiftListParams = {}) {
  const { data } = await apiClient.get<WorkShiftPage>("/work-shifts", { params });
  return data;
}
