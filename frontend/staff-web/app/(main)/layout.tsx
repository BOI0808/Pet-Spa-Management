import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SessionGate, SessionSkeleton } from "@/lib/auth/session-gate";

// Khung các màn hình sau đăng nhập: thanh trên + vùng nội dung rộng tối đa 1200px (`.web-body` trong ui-demo).
// SW-01 (đăng nhập) không có thanh trên nên không nằm trong nhóm này.
// SessionGate chặn nội dung cho đến khi có phiên của tài khoản nhân viên và đúng vai trò của màn đang mở (BR-05).
// Phiên chỉ có ở trình duyệt nên khi render ở server SessionGate hiện khung xương thay cho trang con, và Next.js 16
// báo "Could not validate … instant navigation" ở chế độ dev. Vì vậy mỗi page.tsx trong nhóm này đặt
// `export const instant = false` (lỗi chỉ tắt được ở chính trang, không tắt được ở layout) – giống Web Khách hàng.
// Cổng theo vai trò chỉ chạy khi trang tồn tại: thẻ làm màn mới nhớ thêm dòng `instant` này.
// Suspense quanh SessionGate: cổng đọc đường dẫn (usePathname) để chặn theo vai trò. Với đường dẫn có tham số động
// (vd. /khach-hang/[customerId]/thu-cung/them), lúc build chưa biết đường dẫn nên Next.js 16 bắt phần đọc nó phải nằm
// trong Suspense, nếu không build báo "client rendering was requested outside a Suspense boundary".
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 pb-[72px] pt-7 max-[980px]:px-4 max-[980px]:pb-14 max-[980px]:pt-5">
        <Suspense fallback={<SessionSkeleton />}>
          <SessionGate>{children}</SessionGate>
        </Suspense>
      </main>
    </>
  );
}
