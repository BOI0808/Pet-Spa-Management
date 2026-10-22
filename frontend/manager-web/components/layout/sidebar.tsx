import Link from "next/link";
import { Suspense } from "react";
import { PawLogo } from "@/components/icons";
import { ROUTES } from "@/lib/routes";
import { ActiveSidebarNav, SidebarNav } from "./sidebar-nav";
import { onDarkFocusClass } from "./sidebar-styles";

/** Logo trên nền tối: ô trắng có dấu chân Lagoon 800, chấm Apricot ở góc (`.mw-side .brand-mark`). */
function BrandMark() {
  return (
    <span className="relative grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-white after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-lagoon-800 after:bg-apricot after:content-['']">
      <PawLogo className="size-5 fill-lagoon-800" />
    </span>
  );
}

// Thanh bên tối 248px của web quản lý (`.mw-side` trong ui-demo; UI-Screens 2.1, vùng A – D).
// Dưới 980px thành thanh ngang cuộn được và ẩn khối tài khoản, như ui-demo.
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-62 flex-col bg-lagoon-800 text-[#CDE3E5] max-[980px]:static max-[980px]:w-auto max-[980px]:flex-row max-[980px]:overflow-x-auto">
      <Link
        href={ROUTES.dashboard}
        className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap px-5 pb-4 pt-[18px] text-base font-bold text-white ${onDarkFocusClass}`}
      >
        <BrandMark />
        <span>
          Spa thú cưng
          <small className="block text-[11px] font-medium leading-[14px] text-[#89BDC2]">Web quản lý</small>
        </span>
      </Link>
      {/* Thẻ 143 – 1.7.4.1 truyền số lịch Pending (UI-Screens 2.1 vùng C); trước đó để null nên huy hiệu ẩn. */}
      <Suspense fallback={<SidebarNav pathname={null} pendingCount={null} />}>
        <ActiveSidebarNav pendingCount={null} />
      </Suspense>
    </aside>
  );
}
