import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SessionGate } from "@/lib/auth/session-gate";

// Khung các màn hình sau đăng nhập: thanh trên + vùng nội dung rộng tối đa 1200px (`.web-body` trong ui-demo).
// CW-01, CW-02 (đăng ký, đăng nhập) không có thanh trên nên không nằm trong nhóm này.
// SessionGate chỉ hiện màn khi đã có phiên và GET /me (Frontend-Architecture 4.2).
// Phiên chỉ có ở trình duyệt nên khi render ở server SessionGate hiện khung xương thay cho trang con, và Next.js 16
// báo “Could not validate … instant navigation” ở chế độ dev. Vì vậy mỗi page.tsx trong nhóm này đặt
// `export const instant = false` (lỗi chỉ tắt được ở chính trang, không tắt được ở layout).
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 pb-[72px] pt-7 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5">
        <SessionGate>{children}</SessionGate>
      </main>
    </>
  );
}
