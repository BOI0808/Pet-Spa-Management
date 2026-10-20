import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

// Khung các màn hình sau đăng nhập: thanh trên + vùng nội dung rộng tối đa 1200px (`.web-body` trong ui-demo).
// SW-01 (đăng nhập) không có thanh trên nên không nằm trong nhóm này.
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 pb-[72px] pt-7 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5">
        {children}
      </main>
    </>
  );
}
