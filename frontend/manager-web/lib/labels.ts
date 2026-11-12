// Nhãn hiển thị cho giá trị enum của API (UI-Screens 2.4). Chỉ khai báo enum web quản lý đang dùng.
import type { AppointmentStatus, AppointmentType, SizeGroup, Species, StaffRole, Temperament } from "@/lib/api/types";

/** Thứ tự hiển thị các loài: Chó, Mèo, Thỏ, Chuột lang (UI demo). */
export const SPECIES_ORDER: readonly Species[] = ["Dog", "Cat", "Rabbit", "GuineaPig"];

export const SPECIES_LABELS: Record<Species, string> = {
  Dog: "Chó",
  Cat: "Mèo",
  Rabbit: "Thỏ",
  GuineaPig: "Chuột lang",
};

export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  Small: "Nhỏ",
  Medium: "Vừa",
  Large: "Lớn",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  Receptionist: "Lễ tân",
  SpaStaff: "Nhân viên spa",
};

export const TEMPERAMENT_LABELS: Record<Temperament, string> = {
  Calm: "Hiền",
  Normal: "Bình thường",
  Difficult: "Khó tính, dữ",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  Spa: "Spa",
  Hotel: "Lưu trú",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  Received: "Đã tiếp nhận",
  InProgress: "Đang thực hiện",
  InStay: "Đang lưu trú",
  Completed: "Hoàn tất",
  Cancelled: "Đã hủy",
};
