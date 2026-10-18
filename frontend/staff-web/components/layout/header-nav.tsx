"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { ROUTES } from "@/lib/routes";
import type { StaffRole } from "@/lib/staff-role";
import { Dropdown, dropdownItemClass } from "./dropdown";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Vai trò được thấy mục này (Authorization mục 9; `data-role` trong ui-demo). */
  roles: StaffRole[];
};

const BOTH_ROLES: StaffRole[] = ["Receptionist", "SpaStaff"];

// Thứ tự và biểu tượng theo `.sw-nav` của ui-demo.
const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.appointments, label: "Lịch hẹn", icon: "calendar", roles: BOTH_ROLES },
  { href: ROUTES.checkIn, label: "Tiếp nhận", icon: "clipboard", roles: ["Receptionist"] },
  { href: ROUTES.checkOut, label: "Trả thú cưng", icon: "handover", roles: ["Receptionist"] },
  { href: ROUTES.customers, label: "Khách hàng", icon: "users", roles: ["Receptionist"] },
  { href: ROUTES.bookForCustomer, label: "Đặt lịch thay", icon: "calendar-plus", roles: ["Receptionist"] },
  { href: ROUTES.cages, label: "Chuồng", icon: "grid", roles: ["Receptionist"] },
  { href: ROUTES.payments, label: "Thanh toán", icon: "wallet", roles: ["Receptionist"] },
  { href: ROUTES.workHistory, label: "Lịch sử công việc", icon: "history", roles: ["SpaStaff"] },
  { href: ROUTES.services, label: "Dịch vụ", icon: "list", roles: ["SpaStaff"] },
];

/**
 * `role = null`: chưa biết vai trò (chưa có đăng nhập) nên hiện đủ mục của cả hai vai trò.
 * Đây chỉ là ẩn/hiện giao diện; quyền thật luôn do backend kiểm tra (Authorization mục 2).
 */
function canSee(roles: StaffRole[], role: StaffRole | null) {
  return role === null || roles.includes(role);
}

function isUnder(pathname: string | null, base: string) {
  if (!pathname) return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Vùng chạm cao 44px cho web nhân viên (mục 6.1).
const navItemClass =
  "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-[13px] font-medium text-[#CFE7E9] hover:bg-white/10 hover:text-white max-[640px]:gap-0 max-[640px]:px-[11px]";
const navItemActiveClass = "bg-white font-semibold text-lagoon-700 hover:bg-white hover:text-lagoon-700";

// Màn hẹp hơn 640px chỉ còn icon (như ui-demo); nhãn vẫn còn cho trình đọc màn hình.
function NavLabel({ children }: { children: string }) {
  return <span className="max-[640px]:sr-only">{children}</span>;
}

type HeaderNavProps = {
  /** `null` khi chưa biết trang hiện tại. */
  pathname: string | null;
  role: StaffRole | null;
};

/** Menu chính và góc phải của thanh trên. */
export function HeaderNav({ pathname, role }: HeaderNavProps) {
  const notificationsActive = isUnder(pathname, ROUTES.notifications);

  return (
    <>
      <nav
        aria-label="Menu nhân viên"
        className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] max-[980px]:flex-1 [&::-webkit-scrollbar]:hidden"
      >
        {NAV_ITEMS.filter((item) => canSee(item.roles, role)).map((item) => {
          const active = isUnder(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${navItemClass} ${active ? navItemActiveClass : ""}`}
            >
              <Icon name={item.icon} />
              <NavLabel>{item.label}</NavLabel>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Chỉ nhân viên spa có thông báo (SA 6.2). Số chưa đọc hiển thị ở thẻ 1.6.3.3. */}
        {canSee(["SpaStaff"], role) && (
          <Link
            href={ROUTES.notifications}
            aria-label="Thông báo"
            title="Thông báo"
            aria-current={notificationsActive ? "page" : undefined}
            className={`relative grid size-11 place-items-center rounded-xl text-white hover:bg-white/10 ${
              notificationsActive ? "bg-white text-lagoon-700 hover:bg-white" : ""
            }`}
          >
            <Icon name="bell" className="size-[22px]" />
          </Link>
        )}
        {/* Tên và vai trò người dùng (`.user-chip` trong ui-demo) hiển thị khi làm đăng nhập (thẻ 121). */}
        <Dropdown
          align="right"
          buttonClassName="flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-white/25 pl-1 pr-2.5 text-sm font-medium text-white hover:border-white/50 max-[860px]:gap-1 max-[860px]:pr-1.5"
          label={
            <>
              <span className="grid size-8 place-items-center rounded-full bg-apricot-100 text-apricot-700">
                <Icon name="user" />
              </span>
              <span className="max-[860px]:sr-only">Tài khoản</span>
              <Icon name="chev-d" className="size-4" />
            </>
          }
        >
          <Link href={ROUTES.profile} className={dropdownItemClass}>
            <Icon name="user" />
            Hồ sơ cá nhân
          </Link>
          {/* Lễ tân mở danh mục dịch vụ từ đây; nhân viên spa có mục "Dịch vụ" trên menu. */}
          {canSee(["Receptionist"], role) && (
            <Link href={ROUTES.services} className={dropdownItemClass}>
              <Icon name="list" />
              Danh mục dịch vụ
            </Link>
          )}
          <div className="mx-1 my-1.5 h-px bg-line" />
          {/* Thu hồi refresh token (POST /auth/logout) làm ở thẻ 121. */}
          <Link href={ROUTES.login} className={dropdownItemClass}>
            <Icon name="logout" />
            Đăng xuất
          </Link>
        </Dropdown>
      </div>
    </>
  );
}

/** Bản đọc trang hiện tại để tô mục đang chọn; đặt trong Suspense vì đang bật cacheComponents. */
export function ActiveHeaderNav({ role }: { role: StaffRole | null }) {
  return <HeaderNav pathname={usePathname()} role={role} />;
}
