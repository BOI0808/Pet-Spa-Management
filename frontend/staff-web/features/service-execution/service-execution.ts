// Luật hiển thị của SW-11 Thực hiện dịch vụ (UI-Screens.md SW-11). Không gọi API ở đây.
// Lý do khóa nút tính ở web từ dữ liệu đang có; backend vẫn kiểm tra lại và trả 409 (UI-Screens SW-11 “Hành vi”).
import type { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, CostConfirmation, Pet, Photo, PhotoKind } from "@/lib/api/types";
import { formatDayMonth, formatWeight } from "@/lib/format";
import { MAX_PHOTO_BYTES } from "@/lib/image-resize";
import { SIZE_GROUP_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { speciesAndBreed } from "../appointments/appointments";

/** Câu lý do dưới nút – Frontend-Conventions 5.2, cùng câu với ui-demo. */
export const REASONS = {
  beforePhoto: "Cần ảnh trước chăm sóc hợp lệ.",
  costPending: "Đang chờ khách xác nhận chi phí mới.",
  complete: "Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.",
} as const;

export type Reason = (typeof REASONS)[keyof typeof REASONS];

/** Yêu cầu xác nhận chi phí đang chờ (tối đa một mỗi lịch); null nếu không có. */
export function pendingCostOf(appointment: AppointmentDetail): CostConfirmation | null {
  return appointment.pendingCostConfirmation?.status === "Pending" ? appointment.pendingCostConfirmation : null;
}

/** Ảnh mới nhất của một loại; danh sách đã xếp theo thời gian tải lên (`useAppointmentPhotos`). */
export function latestPhoto(photos: Photo[] | undefined, kind: PhotoKind) {
  return photos?.filter((photo) => photo.kind === kind).at(-1) ?? null;
}

/**
 * Lý do khóa “Bắt đầu thực hiện” (vùng 7, lịch Đã tiếp nhận). Ảnh trước “hợp lệ” = lịch đang mở đã có ảnh `Before`
 * (G-13): web không đọc được ảnh của lịch khác nên không biết ảnh gần nhất của bé; điều kiện cuối cùng theo 409
 * `PHOTO_REQUIRED`. Ảnh vừa tải ở lịch này luôn trong hạn 7 ngày (BR-20).
 */
export function startBlockers(appointment: AppointmentDetail, hasBeforePhoto: boolean): Reason[] {
  const reasons: Reason[] = [];
  if (!hasBeforePhoto) reasons.push(REASONS.beforePhoto);
  if (pendingCostOf(appointment)) reasons.push(REASONS.costPending);
  return reasons;
}

/** Số dịch vụ đã xong / tổng (vùng 5). */
export function serviceProgress(appointment: AppointmentDetail) {
  const services = appointment.services ?? [];
  return { done: services.filter((service) => service.isDone).length, total: services.length };
}

/** “Hoàn tất lịch hẹn” mở khi mọi dịch vụ xong (BR-06) và có ảnh sau (BR-20) – FR-EXE-04. */
export function canComplete(appointment: AppointmentDetail, hasAfterPhoto: boolean) {
  const { done, total } = serviceProgress(appointment);
  return total > 0 && done === total && hasAfterPhoto;
}

/**
 * 409 của Bắt đầu / Hoàn tất mà web hiện thành lý do dưới nút (UI-Screens SW-11 “Mã lỗi tại màn”). Mã khác
 * (INVALID_TRANSITION, mất mạng…) hiện bằng ErrorAlert.
 */
export function reasonFromError(error: ApiError, action: "start" | "complete"): Reason | null {
  switch (error.code) {
    case "PHOTO_REQUIRED":
      return action === "start" ? REASONS.beforePhoto : REASONS.complete;
    case "COST_CONFIRMATION_PENDING":
      return REASONS.costPending;
    case "SERVICES_INCOMPLETE":
      return REASONS.complete;
    default:
      return null;
  }
}

/**
 * Kiểm tra tệp trước khi tải (UI-Screens SW-11 “Kiểm tra trước khi tải ảnh”): chỉ ảnh, tối đa 50 MB (cùng giới hạn
 * backend). Kiểm theo tệp gốc, trước khi thu nhỏ.
 */
export function validatePhotoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Chỉ chấp nhận tệp ảnh.";
  if (file.size > MAX_PHOTO_BYTES) return "Ảnh tối đa 50 MB.";
  return null;
}

/** Dải thời gian dưới ảnh: “09:10 hôm nay” hoặc “09:10, 06/10” (ui-demo SW-11). */
export function photoMeta(photo: Photo, today: string) {
  const date = toStoreDate(photo.uploadedAt);
  return `${toStoreTime(photo.uploadedAt)}${date === today ? " hôm nay" : `, ${formatDayMonth(date)}`}`;
}

/** “Bông, chó Poodle” – tiêu đề trang (ui-demo SW-11). */
export function petHeading(petName: string, pet: Pet | null) {
  if (!pet) return petName;
  const kind = speciesAndBreed(pet);
  return `${petName}, ${kind.charAt(0).toLocaleLowerCase("vi-VN")}${kind.slice(1)}`;
}

/**
 * Câu nhóm kích cỡ cuối dòng mô tả (vùng 1): đang chờ khách xác nhận thì nói nhóm hồ sơ và nhóm mới; đã cân thì kèm
 * cân thực tế.
 */
export function describeSizeGroup(appointment: AppointmentDetail) {
  const group = SIZE_GROUP_LABELS[appointment.sizeGroup];
  const pending = pendingCostOf(appointment);
  if (pending) return `Hồ sơ nhóm ${group}, đang chờ khách xác nhận lên ${SIZE_GROUP_LABELS[pending.newSizeGroup]}.`;
  if (appointment.actualWeightKg != null) return `Nhóm ${group} (cân thực tế ${formatWeight(appointment.actualWeightKg)}).`;
  return `Nhóm ${group}.`;
}

/** Vùng 2: “dị ứng nhẹ với sữa tắm có mùi. Tính cách bình thường. Lông xoăn, màu kem.” – bỏ phần trống. */
export function profileNote(pet: Pet) {
  const notes = pet.notes?.trim().replace(/\.$/, "");
  const coat = pet.coatNote?.trim().replace(/\.$/, "");
  return [
    notes && `${notes}.`,
    `Tính cách ${TEMPERAMENT_LABELS[pet.temperament].toLocaleLowerCase("vi-VN")}.`,
    coat && `Lông ${coat.charAt(0).toLocaleLowerCase("vi-VN")}${coat.slice(1)}.`,
  ]
    .filter(Boolean)
    .join(" ");
}
