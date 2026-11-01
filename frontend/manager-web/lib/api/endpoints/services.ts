import { apiClient } from "@/lib/api/client";
import type { ActiveToggleRequest, Service, ServiceCreated, ServiceRequest } from "@/lib/api/types";

/** GET /services – Quản lý nhận cả dịch vụ đã ngừng (FR-SVC-04, đề xuất trong API-Notes mục 8 #9). */
export async function listServices() {
  const { data } = await apiClient.get<Service[]>("/services");
  return data;
}

/** POST /services – FR-SVC-01. */
export async function createService(body: ServiceRequest) {
  const { data } = await apiClient.post<ServiceCreated>("/services", body);
  return data;
}

/** PUT /services/{id} – FR-SVC-02. */
export async function updateService({ serviceId, body }: { serviceId: string; body: ServiceRequest }) {
  await apiClient.put(`/services/${serviceId}`, body);
}

/** PATCH /services/{id}/status – FR-SVC-03: `isActive = false` là ngừng cung cấp, `true` là mở lại. */
export async function setServiceStatus({ serviceId, isActive }: { serviceId: string } & ActiveToggleRequest) {
  await apiClient.patch(`/services/${serviceId}/status`, { isActive } satisfies ActiveToggleRequest);
}
