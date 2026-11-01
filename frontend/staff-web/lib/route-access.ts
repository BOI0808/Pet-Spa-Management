import { ROUTES } from "./routes";
import type { StaffRole } from "./staff-role";

const BOTH_ROLES: StaffRole[] = ["Receptionist", "SpaStaff"];
const RECEPTIONIST: StaffRole[] = ["Receptionist"];
const SPA_STAFF: StaffRole[] = ["SpaStaff"];

/**
 * Vai trò được vào từng màn hình (Authorization mục 9; `data-role` trong ui-demo).
 * Menu và `canAccessPath` cùng đọc bảng này để ẩn menu và chặn gõ thẳng đường dẫn luôn khớp nhau.
 * Chỉ là giao diện; quyền thật luôn do backend kiểm tra (Authorization mục 2).
 */
export const ROUTE_ROLES: Record<Exclude<keyof typeof ROUTES, "login">, StaffRole[]> = {
  appointments: BOTH_ROLES,
  checkIn: RECEPTIONIST,
  checkOut: RECEPTIONIST,
  customers: RECEPTIONIST,
  bookForCustomer: RECEPTIONIST,
  cages: RECEPTIONIST,
  payments: RECEPTIONIST,
  workHistory: SPA_STAFF,
  notifications: SPA_STAFF,
  services: BOTH_ROLES,
  profile: BOTH_ROLES,
};

/** Đường dẫn thuộc màn nào thì theo vai trò của màn đó (kể cả màn con như /lich-hen/123); đường dẫn lạ để trang 404 xử lý. */
export function canAccessPath(pathname: string, role: StaffRole) {
  const key = (Object.keys(ROUTE_ROLES) as (keyof typeof ROUTE_ROLES)[]).find(
    (name) => pathname === ROUTES[name] || pathname.startsWith(`${ROUTES[name]}/`),
  );
  return key === undefined || ROUTE_ROLES[key].includes(role);
}
