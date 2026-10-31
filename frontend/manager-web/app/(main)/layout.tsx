import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionGate } from "@/lib/auth/session-gate";

// Khung các màn hình sau đăng nhập: thanh bên 248px + vùng nội dung rộng tối đa 1280px (`.mw-main .web-body` trong ui-demo).
// MW-01 (đăng nhập) không có thanh bên nên không nằm trong nhóm này.
// SessionGate chặn nội dung cho đến khi có phiên đúng vai trò Quản lý (BR-05).
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="ml-62 max-[980px]:ml-0">
        <main className="mx-auto w-full max-w-[1280px] px-8 pb-[72px] pt-7 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5">
          <SessionGate>{children}</SessionGate>
        </main>
      </div>
    </>
  );
}
