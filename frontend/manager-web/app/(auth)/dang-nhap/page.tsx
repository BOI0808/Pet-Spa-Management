import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/screens/login-screen";

// MW-01 Đăng nhập (không có thanh bên). `LoginScreen` đọc `useSearchParams` nên phải nằm trong Suspense (đang bật cacheComponents).
export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
