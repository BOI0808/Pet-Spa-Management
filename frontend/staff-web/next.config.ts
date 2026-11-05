import type { NextConfig } from "next";
import { ROUTES } from "./lib/routes";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Màn đầu tiên của cả lễ tân và nhân viên spa là SW-02 Lịch hẹn. Chuyển hướng ở đây (xét trước khi tìm trang)
  // thay vì gọi redirect() trong page.tsx – cách đó làm Next 16 báo lỗi khi kiểm tra trước trang "/" (cacheComponents).
  // permanent: false (307) để trình duyệt không nhớ đích; chưa đăng nhập thì proxy.ts chuyển tiếp từ SW-02 sang /dang-nhap.
  redirects() {
    return [{ source: "/", destination: ROUTES.appointments, permanent: false }];
  },
};

export default nextConfig;
