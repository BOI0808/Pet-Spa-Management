"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { useSession } from "@/lib/auth/use-session";
import { ROUTE_ROLES } from "@/lib/route-access";
import { ROUTES } from "@/lib/routes";
import { STAFF_ROLE_LABELS, type StaffRole } from "@/lib/staff-role";
import { Dropdown, dropdownItemClass } from "./dropdown";
import { onDarkFocusClass } from "./header-styles";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Vai trò được thấy mục này trên menu; lấy từ `ROUTE_ROLES` (Authorization mục 9; `data-role` trong ui-demo). */
  roles: StaffRole[];
};

// Thứ tự và biểu tượng theo `.sw-nav` của ui-demo.
const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.appointments, label: "Lịch hẹn", icon: "calendar", roles: ROUTE_ROLES.appointments },
  { href: ROUTES.checkIn, label: "Tiếp nhận", icon: "clipboard", roles: ROUTE_ROLES.checkIn },
  { href: ROUTES.checkOut, label: "Trả thú cưng", icon: "handover", roles: ROUTE_ROLES.checkOut },
  { href: ROUTES.customers, label: "Khách hàng", icon: "users", roles: ROUTE_ROLES.customers },
  { href: ROUTES.bookForCustomer, label: "Đặt lịch thay", icon: "calendar-plus", roles: ROUTE_ROLES.bookForCustomer },
  { href: ROUTES.cages, label: "Chuồng", icon: "grid", roles: ROUTE_ROLES.cages },
  { href: ROUTES.payments, label: "Thanh toán", icon: "wallet", roles: ROUTE_ROLES.payments },
  { href: ROUTES.workHistory, label: "Lịch sử công việc", icon: "history", roles: ROUTE_ROLES.workHistory },
  // Cả hai vai trò được vào SW-14, nhưng chỉ nhân viên spa có mục này trên menu; lễ tân mở từ menu tài khoản (ui-demo).
  { href: ROUTES.services, label: "Dịch vụ", icon: "list", roles: ["SpaStaff"] },
];

/** Chưa biết vai trò (`role = null`, đang tải phiên) thì không mục nào hiện: không để lộ mục của vai trò kia rồi mới ẩn. */
function canSee(roles: StaffRole[], role: StaffRole | null) {
  return role !== null && roles.includes(role);
}

function isUnder(pathname: string | null, base: string) {
  if (!pathname) return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Vùng chạm cao 44px cho web nhân viên (mục 6.1).
const navItemClass = `inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-[13px] font-medium text-[#CFE7E9] hover:bg-white/10 hover:text-white max-[640px]:gap-0 max-[640px]:px-[11px] ${onDarkFocusClass}`;
const navItemActiveClass = "bg-white font-semibold text-lagoon-700 hover:bg-white hover:text-lagoon-700";

// Màn hẹp hơn 640px chỉ còn icon (như ui-demo); nhãn vẫn còn cho trình đọc màn hình.
function NavLabel({ children }: { children: string }) {
  return <span className="max-[640px]:sr-only">{children}</span>;
}

type HeaderNavProps = {
  /** `null` khi chưa biết trang hiện tại. */
  pathname: string | null;
  /** `null` khi chưa có kết quả GET /me. */
  role: StaffRole | null;
  /** Tên hiển thị trong ô tài khoản; `null` khi chưa tải xong phiên. */
  userName?: string | null;
  /** Chữ cái đầu trên avatar; `null` thì hiện biểu tượng người. */
  initials?: string | null;
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

// Khung xương của menu trong lúc chờ biết vai trò; giữ chỗ để thanh trên không nhảy.
function NavSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải menu" className="flex items-center gap-0.5 p-1 max-[980px]:flex-1">
      {[0, 1, 2].map((index) => (
        <span key={index} className="h-11 w-24 animate-pulse rounded-[10px] bg-white/10 max-[640px]:w-11" />
      ))}
    </div>
  );
}

/** Menu chính và góc phải của thanh trên. */
export function HeaderNav({
  pathname,
  role,
  userName = null,
  initials = null,
  onLogout,
  isLoggingOut = false,
}: HeaderNavProps) {
  const notificationsActive = isUnder(pathname, ROUTES.notifications);

  return (
    <>
      {/* `relative`: nhãn `sr-only` (position: absolute) của mục bị cuộn khuất phải nằm trong vùng cuộn này,
          nếu không chúng tràn ra ngoài và làm cả trang cuộn ngang ở màn hẹp.
          `p-1`: chừa chỗ cho vòng focus, vì vùng cuộn cắt mọi thứ nằm ngoài nó. */}
      {role === null ? (
        <NavSkeleton />
      ) : (
      <nav
        aria-label="Menu nhân viên"
        className="relative flex min-w-0 items-center gap-0.5 overflow-x-auto p-1 [scrollbar-width:none] max-[980px]:flex-1 [&::-webkit-scrollbar]:hidden"
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
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Chỉ nhân viên spa có thông báo (SA 6.2). Số chưa đọc hiển thị ở thẻ 1.6.3.3. */}
        {canSee(["SpaStaff"], role) && (
          <Link
            href={ROUTES.notifications}
            aria-label="Thông báo"
            title="Thông báo"
            aria-current={notificationsActive ? "page" : undefined}
            className={`relative grid size-11 place-items-center rounded-xl text-white hover:bg-white/10 ${onDarkFocusClass} ${
              notificationsActive ? "bg-white text-lagoon-700 hover:bg-white" : ""
            }`}
          >
            <Icon name="bell" className="size-[22px]" />
          </Link>
        )}
        {/* Tên và vai trò người dùng (`.user-chip` và `.uc-text` trong ui-demo); màn hẹp chỉ còn biểu tượng. */}
        <Dropdown
          align="right"
          buttonClassName={`flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-white/25 pl-1 pr-2.5 text-sm font-medium text-white hover:border-white/50 max-[860px]:gap-1 max-[860px]:pr-1.5 ${onDarkFocusClass}`}
          label={
            <>
              {/* `.avatar` trong ui-demo: chữ cái đầu 12px đậm trên nền Apricot nhạt. */}
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-apricot-100 text-xs font-bold text-apricot-700"
              >
                {initials ?? <Icon name="user" />}
              </span>
              <span className="flex flex-col items-start text-left leading-[15px] max-[860px]:sr-only">
                {userName ?? "Tài khoản"}
                {role && <small className="text-[11px] font-medium opacity-80">{STAFF_ROLE_LABELS[role]}</small>}
              </span>
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
          {/* Thu hồi refresh token ở backend rồi về SW-01 (POST /api/session/logout). */}
          <button
            type="button"
            onClick={onLogout}
            disabled={!onLogout || isLoggingOut}
            className={`${dropdownItemClass} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Icon name="logout" />
            {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </Dropdown>
      </div>
    </>
  );
}

/**
 * Chữ cái đầu của hai từ cuối trong họ tên, như ui-demo ("Thu Hà" → "TH"): tên người Việt đứng cuối nên hai từ cuối
 * phân biệt người tốt hơn họ. Chỉ lấy từ là chữ (`\p{L}`), bỏ số và dấu ngoặc: tên tài khoản thử như
 * "Lễ tân thử (thẻ 121)" ra "TT" thay vì "(1". Không còn từ nào là chữ thì trả `null` để hiện biểu tượng người.
 */
function getInitials(fullName: string) {
  // `\p{M}`: giữ dấu tiếng Việt viết dạng tổ hợp (NFD) trong cùng một từ.
  const words = fullName.match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
  if (words.length === 0) return null;
  return words
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("vi");
}

/**
 * Bản đọc trang hiện tại để tô mục đang chọn, và đọc phiên đăng nhập để biết vai trò, tên, đăng xuất.
 * Đặt trong Suspense vì đang bật cacheComponents.
 */
export function ActiveHeaderNav() {
  const { me, logout, isLoggingOut } = useSession();
  return (
    <HeaderNav
      pathname={usePathname()}
      role={me?.staffRole ?? null}
      userName={me ? (me.fullName ?? me.userName) : null}
      initials={me?.fullName ? getInitials(me.fullName) : null}
      onLogout={logout}
      isLoggingOut={isLoggingOut}
    />
  );
}
