// Nhãn hiển thị cho giá trị enum của API (UI-Screens 2.4). Chỉ khai báo enum web quản lý đang dùng.
import type {
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  SizeGroup,
  Species,
  StaffRole,
  Temperament,
} from "@/lib/api/types";

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

/** Lý do hủy lịch hẹn (Requirements 3.3 “Vòng đời lịch hẹn”, mục (a) – (e)). */
export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  CustomerCancelled: "Khách hàng chủ động hủy",
  StoreUnable: "Cửa hàng không thể đáp ứng",
  CustomerBeyondDeadline: "Theo yêu cầu của khách, ngoài thời hạn tự hủy",
  NoShow: "Khách vắng mặt",
  CostNotConfirmed: "Khách không xác nhận chi phí mới",
};

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  Spa: "Khoản spa",
  Stay: "Tiền lưu trú",
  LateFee: "Phí trả muộn",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: "Tiền mặt",
  BankQR: "Chuyển khoản QR",
  Online: "Trực tuyến",
};
