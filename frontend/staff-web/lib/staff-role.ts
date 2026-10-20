/**
 * Vai trò của nhân viên (`StaffRole` – API Notes mục 2): lễ tân (LT) hoặc nhân viên spa (NVS).
 * Backend lấy từ dữ liệu nhân viên, web chỉ đọc để ẩn/hiện menu (Authorization mục 9).
 */
export type StaffRole = "Receptionist" | "SpaStaff";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  Receptionist: "Lễ tân",
  SpaStaff: "Nhân viên spa",
};
