"use client";

// UF-11: cổng thanh toán chuyển khách về URL trả về cố định của web kèm `vnp_*` (UI-Screens G-15). Thành phần này nằm
// trong khung các màn sau đăng nhập, thấy mã giao dịch của cổng trên URL thì đưa khách sang CW-09 `?payment=return`.
// Không đọc mã kết quả cổng gắn trên URL: CW-09 tự hỏi backend (GET /appointments/{id}/payments).
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  gatewayTxnRefOf,
  PAYMENT_RETURN_PARAM,
  PAYMENT_RETURN_VALUE,
  paymentReturnPath,
  readPendingPayment,
} from "../online-payment";

export function PaymentReturnRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Đọc thẳng `window.location` để không cần bọc Suspense cho `useSearchParams` ở layout.
    const params = new URLSearchParams(window.location.search);
    const txnRef = gatewayTxnRefOf(params);
    if (!txnRef) return;
    // Backend đã đặt URL trả về đúng CW-09 (G-15): chỉ bỏ các tham số của cổng.
    if (params.get(PAYMENT_RETURN_PARAM) === PAYMENT_RETURN_VALUE) {
      router.replace(`${pathname}?${PAYMENT_RETURN_PARAM}=${PAYMENT_RETURN_VALUE}`);
      return;
    }
    router.replace(paymentReturnPath(txnRef, readPendingPayment()));
  }, [pathname, router]);

  return null;
}
