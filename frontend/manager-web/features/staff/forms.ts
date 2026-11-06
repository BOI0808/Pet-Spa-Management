import type { StaffCreateRequest, StaffMember, StaffRole, StaffUpdateRequest } from "@/lib/api/types";
import { normalizePhone } from "@/lib/validation";

// MW-08·D1 Thêm / sửa nhân viên – UI-Screens.md (FR-STF-01, FR-STF-02)

export type StaffFormValues = {
  fullName: string;
  /** Số điện thoại: chỉ nhập khi tạo, khi sửa chỉ hiển thị. */
  userName: string;
  /** Rỗng khi chưa chọn. */
  staffRole: StaffRole | "";
  /** Mật khẩu ban đầu: chỉ nhập khi tạo. */
  password: string;
};

/** Giá trị ban đầu của form: nhân viên đang sửa, hoặc form trống khi thêm mới. */
export function toStaffFormValues(staff: StaffMember | null): StaffFormValues {
  return {
    fullName: staff?.fullName ?? "",
    userName: staff?.userName ?? "",
    staffRole: staff?.staffRole ?? "",
    password: "",
  };
}

/** Mô tả quyền của từng vai trò trên thẻ chọn (UI-Screens MW-08·D1). */
export const STAFF_ROLE_OPTIONS: readonly { value: StaffRole; description: string }[] = [
  { value: "Receptionist", description: "Ghi nhận khách vãng lai, đặt lịch thay, tiếp nhận, trả thú cưng, thu tiền tại quầy" },
  { value: "SpaStaff", description: "Thực hiện lịch spa được phân công, chụp ảnh trước và sau" },
];

export const DUPLICATE_PHONE_MESSAGE = "Thông tin liên hệ này đã được sử dụng.";

// Cùng câu với CreateStaffRequestValidator, UpdateStaffRequestValidator của backend khi thiếu vai trò.
export function validateStaffRole(value: StaffFormValues["staffRole"]) {
  return value !== "" || "Vui lòng chọn vai trò nhân viên (lễ tân hoặc nhân viên spa).";
}

/**
 * Chuyển form → body POST /staff. Số điện thoại bỏ khoảng trắng, dấu chấm, gạch ngang (Frontend-Conventions 4.1).
 * Không gửi `role`: backend luôn đặt Role = Staff (API-Notes 3). Trả null khi chưa chọn vai trò (đã bị `validateStaffRole` chặn).
 */
export function toStaffCreateRequest(values: StaffFormValues): StaffCreateRequest | null {
  if (values.staffRole === "") return null;
  return {
    userName: normalizePhone(values.userName),
    fullName: values.fullName.trim(),
    staffRole: values.staffRole,
    password: values.password,
  };
}

/** Chuyển form → body PUT /staff/{id}: chỉ họ tên và vai trò, số điện thoại không đổi. */
export function toStaffUpdateRequest(values: StaffFormValues): StaffUpdateRequest | null {
  if (values.staffRole === "") return null;
  return { fullName: values.fullName.trim(), staffRole: values.staffRole };
}
