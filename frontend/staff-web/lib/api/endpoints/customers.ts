import { apiClient } from "@/lib/api/client";
import type { CustomerPage, WalkInCreated, WalkInRequest } from "@/lib/api/types";

export type CustomerSearchParams = { search: string; page?: number; pageSize?: number };

/** GET /customers – lễ tân tìm khách theo một phần số điện thoại (FR-ACC-04). */
export async function listCustomers(params: CustomerSearchParams) {
  const { data } = await apiClient.get<CustomerPage>("/customers", { params });
  return data;
}

/** POST /customers/walk-in – khách vãng lai không có tài khoản; trùng số → 409 DUPLICATE_CONTACT. */
export async function createWalkInCustomer(body: WalkInRequest) {
  const { data } = await apiClient.post<WalkInCreated>("/customers/walk-in", body);
  return data;
}
