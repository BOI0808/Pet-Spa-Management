import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/screens/login-screen";
import { LoginSkeleton } from "@/features/auth/screens/login-skeleton";

// MW-01 Đăng nhập (không có thanh bên). `LoginScreen` đọc `useSearchParams` nên phải nằm trong Suspense (đang bật cacheComponents).
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginScreen />
    </Suspense>
  );
}
