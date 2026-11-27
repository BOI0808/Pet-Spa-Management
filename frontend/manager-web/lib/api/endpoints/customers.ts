import { apiClient } from "@/lib/api/client";
import type { Customer, Page } from "@/lib/api/types";

// MW-09 lấy một trang 100 khách; số khách bị khóa của một cửa hàng spa không nhiều đến vậy.
const CUSTOMER_PAGE_SIZE = 100;

/** GET /customers – với Quản lý chỉ trả khách đang bị khóa tự đặt lịch (FR-BOOK-07). */
export async function listLockedCustomers() {
  const { data } = await apiClient.get<Page<Customer>>("/customers", { params: { page: 1, pageSize: CUSTOMER_PAGE_SIZE } });
  return data;
}

/** POST /customers/{id}/unlock-booking – FR-BOOK-07, BR-15. 204; khách không còn bị khóa → 409 CUSTOMER_NOT_LOCKED, không có khách → 404 NOT_FOUND. */
export async function unlockCustomerBooking(customerId: string) {
  await apiClient.post(`/customers/${customerId}/unlock-booking`);
}
