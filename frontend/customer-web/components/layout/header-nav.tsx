"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth/session";
import { getInitials, getShortName } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Dropdown, dropdownItemClass } from "./dropdown";

function isUnder(pathname: string | null, base: string) {
  if (!pathname) return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const navItemClass =
  "inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-medium text-ink hover:bg-mist max-[860px]:gap-0 max-[860px]:px-[11px]";
const navItemActiveClass = "bg-lagoon-50 font-semibold text-lagoon-700 hover:bg-lagoon-50";

// Màn hẹp hơn 860px chỉ còn icon (như ui-demo); nhãn vẫn còn cho trình đọc màn hình.
function NavLabel({ children }: { children: string }) {
  return <span className="max-[860px]:sr-only">{children}</span>;
}

/** Menu chính và góc phải của thanh trên; `pathname = null` khi chưa biết trang hiện tại. */
export function HeaderNav({ pathname }: { pathname: string | null }) {
  const { me, logout } = useSession();
  const bookingActive = isUnder(pathname, "/dat-lich");
  const notificationsActive = isUnder(pathname, ROUTES.notifications);
  const fullName = me ? (me.fullName ?? me.userName) : null;

  return (
    <>
      <nav aria-label="Menu chính" className="flex items-center gap-1 max-[860px]:gap-0">
        <Link
          href={ROUTES.home}
          aria-current={pathname === ROUTES.home ? "page" : undefined}
          className={`${navItemClass} ${pathname === ROUTES.home ? navItemActiveClass : ""}`}
        >
          <Icon name="home" />
          <NavLabel>Dịch vụ</NavLabel>
        </Link>
        <Link
          href={ROUTES.pets}
          aria-current={isUnder(pathname, ROUTES.pets) ? "page" : undefined}
          className={`${navItemClass} ${isUnder(pathname, ROUTES.pets) ? navItemActiveClass : ""}`}
        >
          <Icon name="paw" />
          <NavLabel>Thú cưng</NavLabel>
        </Link>
        <Dropdown
          buttonClassName={`${navItemClass} cursor-pointer ${bookingActive ? navItemActiveClass : ""}`}
          label={
            <>
              <Icon name="calendar-plus" />
              <NavLabel>Đặt lịch</NavLabel>
              <Icon name="chev-d" className="size-4" />
            </>
          }
        >
          <Link href={ROUTES.spaBooking} className={dropdownItemClass}>
            <Icon name="droplet" className="size-[18px] text-lagoon" />
            <span>
              Lịch spa
              <span className="block text-xs text-muted">Tắm, cắt tỉa, vệ sinh, gói chăm sóc</span>
            </span>
          </Link>
          <Link href={ROUTES.hotelBooking} className={dropdownItemClass}>
            <Icon name="bed" className="size-[18px] text-[#6A5BC4]" />
            <span>
              Lưu trú
              <span className="block text-xs text-muted">Gửi bé ở lại theo đêm</span>
            </span>
          </Link>
        </Dropdown>
        <Link
          href={ROUTES.appointments}
          aria-current={isUnder(pathname, ROUTES.appointments) ? "page" : undefined}
          className={`${navItemClass} ${isUnder(pathname, ROUTES.appointments) ? navItemActiveClass : ""}`}
        >
          <Icon name="calendar" />
          <NavLabel>Lịch hẹn</NavLabel>
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Số thông báo chưa đọc hiển thị khi làm trung tâm thông báo (thẻ 1.5.5.2). */}
        <Link
          href={ROUTES.notifications}
          aria-label="Thông báo"
          title="Thông báo"
          aria-current={notificationsActive ? "page" : undefined}
          className={`relative grid size-10 place-items-center rounded-xl text-ink hover:bg-mist ${
            notificationsActive ? "bg-lagoon-50 text-lagoon-700 hover:bg-lagoon-50" : ""
          }`}
        >
          <Icon name="bell" className="size-[22px]" />
        </Link>
        {/* Avatar chữ cái đầu + tên ngắn từ GET /me; chưa tải xong thì hiện biểu tượng (UI-Screens 2.1, vùng E). */}
        <Dropdown
          align="right"
          buttonClassName="flex h-[42px] cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-line bg-white pl-1 pr-2.5 text-sm font-medium text-ink hover:border-[#B9CED2] max-[860px]:gap-1 max-[860px]:pr-1.5"
          label={
            <>
              {fullName ? (
                <Avatar initials={getInitials(fullName)} />
              ) : (
                <span className="grid size-8 place-items-center rounded-full bg-apricot-100 text-apricot-700">
                  <Icon name="user" />
                </span>
              )}
              <span className="max-[860px]:sr-only">{fullName ? getShortName(fullName) : "Tài khoản"}</span>
              <Icon name="chev-d" className="size-4 text-muted" />
            </>
          }
        >
          <Link href={ROUTES.profile} className={dropdownItemClass}>
            <Icon name="user" />
            Hồ sơ cá nhân
          </Link>
          <Link href={ROUTES.history} className={dropdownItemClass}>
            <Icon name="history" />
            Lịch sử dịch vụ
          </Link>
          <div className="mx-1 my-1.5 h-px bg-line" />
          <button type="button" onClick={() => void logout()} className={`${dropdownItemClass} cursor-pointer`}>
            <Icon name="logout" />
            Đăng xuất
          </button>
        </Dropdown>
      </div>
    </>
  );
}

/** Bản đọc trang hiện tại để tô mục đang chọn; đặt trong Suspense vì đang bật cacheComponents. */
export function ActiveHeaderNav() {
  return <HeaderNav pathname={usePathname()} />;
}
