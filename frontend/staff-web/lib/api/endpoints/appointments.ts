import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  CheckInResult,
  CostConfirmationRespondRequest,
  CostConfirmationRespondResult,
  Payment,
  Photo,
  PhotoCreated,
  PhotoKind,
  ServiceProgressRequest,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
  StatusResult,
  WeightCheckResponse,
} from "@/lib/api/types";

export type SpaSlotParams = { date: string; petId: string; serviceIds: string[] };

/** GET /spa/slots – FR-BOOK-02. `serviceIds` phân cách bằng dấu phẩy, không lặp tham số. */
export async function getSpaSlots({ date, petId, serviceIds }: SpaSlotParams) {
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

/**
 * POST /appointments/spa – FR-BOOK-03. Lễ tân đặt thay gửi kèm `customerId` và không bị khóa tự đặt lịch (BR-15).
 * Backend tính tiền, thời lượng, số nhân viên và giữ chỗ (BR-18).
 */
export async function createSpaAppointment(body: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", body);
  return data;
}

/** Thứ tự của GET /appointments: theo giờ hẹn (`time_*`) hoặc thời điểm tạo (`created_*`). */
export type AppointmentSort = "time_asc" | "time_desc" | "created_desc" | "created_asc";

/** Tham số lọc của GET /appointments. `petId` chỉ áp dụng cho khách nên web nhân viên không gửi. */
export type AppointmentListParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  /** “YYYY-MM-DD” theo múi giờ cửa hàng; lịch spa lọc theo giờ bắt đầu (`slotStart`). */
  date?: string;
  sort?: AppointmentSort;
  page?: number;
  pageSize?: number;
};

/** GET /appointments – FR-EXE-01. Backend lọc theo vai trò: lễ tân toàn cửa hàng, nhân viên spa lịch được phân công (BR-16). */
export async function listAppointments(params: AppointmentListParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

/** GET /appointments/{id} – nhân viên spa mở lịch không được phân công → 403, không trả thông tin (BR-16). */
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

/** GET /appointments/{id}/payments – FR-PAY-04. Spa có 1 khoản; lưu trú tối đa 2 khoản (Stay, LateFee). */
export async function listAppointmentPayments(appointmentId: string) {
  const { data } = await apiClient.get<Payment[]>(`/appointments/${encodeURIComponent(appointmentId)}/payments`);
  return data;
}

/**
 * POST /appointments/{id}/check-in, lịch spa – FR-EXE-02, FR-EXE-10. Backend chuyển lịch sang Đã tiếp nhận rồi đối chiếu
 * cân nặng (BR-23); chỉ hợp lệ trong ngày hẹn và trước khi hết thời gian giữ chỗ, quá hạn → 409 INVALID_TRANSITION.
 */
export async function checkInSpaAppointment({ appointmentId, actualWeightKg }: { appointmentId: string; actualWeightKg: number }) {
  const { data } = await apiClient.post<CheckInResult>(`/appointments/${encodeURIComponent(appointmentId)}/check-in`, {
    actualWeightKg,
  });
  return data;
}

/**
 * POST /appointments/{id}/weight-check, lịch lưu trú – FR-EXE-10, BR-23. Bước 1 của tiếp nhận lưu trú (SW-07 vùng 9),
 * trước khi thu tiền lưu trú; lịch vẫn ở Đã xác nhận. 409 `COST_CONFIRMATION_PENDING` khi đang chờ khách xác nhận.
 */
export async function weightCheckHotelAppointment({ appointmentId, actualWeightKg }: { appointmentId: string; actualWeightKg: number }) {
  const { data } = await apiClient.post<WeightCheckResponse>(
    `/appointments/${encodeURIComponent(appointmentId)}/weight-check`,
    { actualWeightKg },
  );
  return data;
}

/**
 * POST /appointments/{id}/cost-confirmation/respond – FR-EXE-11, BR-23. Lễ tân ghi nhận phản hồi thay khách (SW-07·D1).
 * `accept = true`: hồ sơ thú cưng và nhóm kích cỡ cập nhật, lịch tiếp tục theo chi phí mới; `false`: lịch Đã hủy, lý do
 * `CostNotConfirmed`. Quá hạn → 409 `COST_CONFIRMATION_EXPIRED` (backend hủy lịch luôn); không còn yêu cầu chờ → 404.
 */
export async function respondCostConfirmation(appointmentId: string, body: CostConfirmationRespondRequest) {
  const { data } = await apiClient.post<CostConfirmationRespondResult>(
    `/appointments/${encodeURIComponent(appointmentId)}/cost-confirmation/respond`,
    body,
  );
  return data;
}

// ── Thực hiện lịch spa (SW-11) – FR-EXE-03, 04, 09 ──
// Cả bốn lời gọi chỉ nhân viên spa được phân công (hoặc quản lý) dùng được; ngoài phạm vi → 403 (BR-05, BR-16).

/** GET /appointments/{id}/photos – FR-EXE-09. Backend kiểm tra phạm vi rồi trả URL tạm thời cho từng ảnh. */
export async function listAppointmentPhotos(appointmentId: string) {
  const { data } = await apiClient.get<Photo[]>(`/appointments/${encodeURIComponent(appointmentId)}/photos`);
  return data;
}

export type UploadPhotoParams = {
  appointmentId: string;
  kind: PhotoKind;
  file: Blob;
  /** Tên tệp gửi kèm; backend chỉ đọc loại tệp (`image/*`). */
  fileName: string;
  /** Phần trăm đã gửi (0 – 100) cho thanh tiến trình. */
  onProgress?: (percent: number) => void;
};

/**
 * POST /appointments/{id}/photos (multipart `kind`, `file`) – FR-EXE-09. Ảnh `Before` khi lịch Đã tiếp nhận, `After` khi
 * Đang thực hiện, sai trạng thái → 409 INVALID_TRANSITION; tệp không phải ảnh hoặc quá 50 MB → 400.
 */
export async function uploadAppointmentPhoto({ appointmentId, kind, file, fileName, onProgress }: UploadPhotoParams) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file, fileName);
  const { data } = await apiClient.post<PhotoCreated>(
    `/appointments/${encodeURIComponent(appointmentId)}/photos`,
    form,
    {
      // Client mặc định gửi JSON; giữ header JSON thì Axios đổi FormData thành JSON. Đặt multipart để Axios gửi nguyên
      // FormData, trình duyệt tự điền `boundary`.
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    },
  );
  return data;
}

/**
 * POST /appointments/{id}/start – FR-EXE-03. Đã tiếp nhận → Đang thực hiện. 409 `PHOTO_REQUIRED` (chưa có ảnh trước hợp
 * lệ, BR-20), `COST_CONFIRMATION_PENDING` (BR-23), `INVALID_TRANSITION` (lịch không còn ở Đã tiếp nhận).
 */
export async function startAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/start`);
  return data;
}

/** PATCH /appointments/{id}/services/{serviceId} – FR-EXE-03. Chỉ khi Đang thực hiện, không thì 409 INVALID_TRANSITION. */
export async function updateServiceProgress(appointmentId: string, serviceId: string, body: ServiceProgressRequest) {
  await apiClient.patch(
    `/appointments/${encodeURIComponent(appointmentId)}/services/${encodeURIComponent(serviceId)}`,
    body,
  );
}

/**
 * POST /appointments/{id}/complete – FR-EXE-04. Đang thực hiện → Hoàn tất, hình thành khoản thanh toán spa. 409
 * `SERVICES_INCOMPLETE` (BR-06), `PHOTO_REQUIRED` (chưa có ảnh sau, BR-20), `INVALID_TRANSITION`.
 */
export async function completeAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/complete`);
  return data;
}
