"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, PawLogo, type IconName } from "@/components/icons";
import { ROUTES } from "@/lib/routes";

const MENU_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: ROUTES.monitoring, label: "Giám sát", icon: "dashboard" },
  { href: ROUTES.services, label: "Dịch vụ", icon: "scissors" },
  { href: ROUTES.cages, label: "Chuồng và giá lưu trú", icon: "grid" },
  { href: ROUTES.staff, label: "Nhân viên", icon: "users" },
  { href: ROUTES.spaAppointments, label: "Lịch Spa", icon: "droplet" },
  { href: ROUTES.hotelAppointments, label: "Lịch Lưu trú", icon: "bed" },
  { href: ROUTES.cageStatus, label: "Tình trạng chuồng", icon: "grid" },
  { href: ROUTES.bookingLocks, label: "Gỡ khóa đặt lịch", icon: "lock" },
  { href: ROUTES.payments, label: "Thanh toán", icon: "wallet" },
];

function isActive(pathname: string, href: string) {
  if (href === ROUTES.monitoring) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-62 flex-col bg-lagoon-800 text-[#CDE3E5] narrow:static narrow:w-auto narrow:flex-row narrow:overflow-x-auto">
      <Link
        href={ROUTES.monitoring}
        className="flex items-center gap-2.5 whitespace-nowrap px-5 pb-4 pt-[18px] text-base font-bold text-white"
      >
        <span className="relative grid size-[34px] place-items-center rounded-[11px] bg-white after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-lagoon-800 after:bg-apricot">
          <PawLogo className="size-5 fill-lagoon-800" />
        </span>
        <span>
          Spa thú cưng
          <small className="block text-[11px] font-medium leading-[14px] text-[#89BDC2]">Web quản lý</small>
        </span>
      </Link>
      <nav
        aria-label="Menu quản lý"
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3 pt-1 narrow:flex-row narrow:p-2"
      >
        {MENU_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 items-center gap-3 rounded-[10px] px-3 ${
                active
                  ? "bg-white font-semibold text-lagoon-800"
                  : "font-medium text-[#D3E7E9] hover:bg-white/[.07] hover:text-white"
              }`}
            >
              <Icon name={icon} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}