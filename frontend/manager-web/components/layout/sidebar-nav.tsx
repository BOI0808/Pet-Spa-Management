"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { useSession } from "@/lib/auth/use-session";
import { ROUTES } from "@/lib/routes";
import { onDarkFocusClass } from "./sidebar-styles";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Mục hiện số lịch chờ xác nhận (UI-Screens 2.1 vùng C). */
  showsPendingCount?: boolean;
};

// Thứ tự, nhãn và biểu tượng theo `.side-nav` của ui-demo (User-Flows 3.3).
const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Tổng quan", icon: "dashboard" },
  { href: ROUTES.appointments, label: "Lịch hẹn", icon: "list" },
  { href: ROUTES.pending, label: "Chờ xác nhận", icon: "clipboard", showsPendingCount: true },
  { href: ROUTES.services, label: "Dịch vụ", icon: "scissors" },
  { href: ROUTES.cages, label: "Chuồng & giá", icon: "grid" },
  { href: ROUTES.staff, label: "Nhân viên", icon: "users" },
  { href: ROUTES.workShifts, label: "Lịch làm việc", icon: "calendar" },
  { href: ROUTES.lockedCustomers, label: "Khách bị khóa", icon: "lock" },
  { href: ROUTES.payments, label: "Thanh toán", icon: "wallet" },
  { href: ROUTES.config, label: "Cấu hình", icon: "sliders" },
];

function isUnder(pathname: string | null, base: string) {
  if (!pathname) return false;
  // "/" là MW-02 Tổng quan, không phải tiền tố của mọi màn.
  if (base === ROUTES.dashboard) return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const navItemClass = `flex h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-[10px] px-3 ${onDarkFocusClass}`;
const navItemActiveClass = "bg-white font-semibold text-lagoon-800";
const navItemIdleClass = "font-medium text-[#D3E7E9] hover:bg-white/[.07] hover:text-white";
const userLinkClass = `flex items-center gap-2.5 rounded-[10px] p-1.5 ${onDarkFocusClass}`;
const userLinkActiveClass = "bg-white/[.08] text-white";
const userLinkIdleClass = "text-[#D3E7E9] hover:bg-white/[.08] hover:text-white";

type SidebarNavProps = {
  /** `null` khi chưa biết trang hiện tại. */
  pathname: string | null;
  /** Số lịch `Pending`; `null` hoặc 0 thì ẩn huy hiệu. */
  pendingCount: number | null;
};

/** Menu quản lý (vùng B, C) và khối tài khoản cuối thanh bên (vùng D). */
export function SidebarNav({ pathname, pendingCount }: SidebarNavProps) {
  const profileActive = isUnder(pathname, ROUTES.profile);
  const { me, logout } = useSession();

  return (
    <>
      {/* `relative`: nhãn `sr-only` (position: absolute) của huy hiệu phải nằm trong vùng cuộn này,
          nếu không nó tràn ra ngoài và làm cả trang cuộn ngang ở màn hẹp (cách web nhân viên đã làm). */}
      <nav
        aria-label="Menu quản lý"
        className="relative flex min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3 pt-1 max-[980px]:flex-row max-[980px]:overflow-x-auto max-[980px]:p-2"
      >
        {NAV_ITEMS.map((item) => {
          const active = isUnder(pathname, item.href);
          const count = item.showsPendingCount && pendingCount ? pendingCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${navItemClass} ${active ? navItemActiveClass : navItemIdleClass}`}
            >
              <Icon name={item.icon} />
              {item.label}
              {count > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-apricot px-1.5 text-xs font-bold text-ink"
                  >
                    {count}
                  </span>
                  <span className="sr-only">, {count} lịch đang chờ</span>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-white/10 p-3 max-[980px]:hidden">
        {/* Tên hiển thị là `userName` của GET /me (UI-Screens 2.1 vùng D, G-11). */}
        <Link
          href={ROUTES.profile}
          aria-current={profileActive ? "page" : undefined}
          className={`${userLinkClass} min-w-0 flex-1 ${profileActive ? userLinkActiveClass : userLinkIdleClass}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-lagoon-800">
            <Icon name="user" />
          </span>
          <span className="leading-[18px]">
            <span className="block font-bold">{me?.userName ?? "Tài khoản"}</span>
            <span className="block text-xs text-[#89BDC2]">Quản lý</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Đăng xuất"
          title="Đăng xuất"
          onClick={logout}
          className={`${userLinkClass} ${userLinkIdleClass} flex-none`}
        >
          <Icon name="logout" />
        </button>
      </div>
    </>
  );
}

/** Bản đọc trang hiện tại để tô mục đang chọn; đặt trong Suspense vì đang bật cacheComponents. */
export function ActiveSidebarNav({ pendingCount }: { pendingCount: number | null }) {
  return <SidebarNav pathname={usePathname()} pendingCount={pendingCount} />;
}
