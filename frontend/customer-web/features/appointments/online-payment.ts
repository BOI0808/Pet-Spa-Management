// Thanh toán trực tuyến (UF-11, UC-24): ghi nhớ giao dịch vừa mở để khi cổng chuyển khách về thì biết lịch hẹn nào.
// URL trả về do backend cấu hình (`Payment__Vnpay__ReturnUrl`, UI-Screens G-15). Hiện là một địa chỉ cố định của web
// (vd. trang chủ) kèm tham số `vnp_*` của cổng, không mang mã lịch hẹn, nên web lưu mã lịch theo `txnRef` trước khi
// chuyển sang cổng rồi đưa khách về `/lich-hen/{appointmentId}?payment=return`.
// Chỉ lưu mã lịch, mã giao dịch và cổng (không phải token, không phải dữ liệu thẻ). Kết quả thanh toán luôn đọc từ
// GET /appointments/{id}/payments; tham số do cổng gắn vào URL không được dùng để coi là đã thanh toán.
import type { PaymentGateway } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

/** Tham số trên CW-09 khi quay về từ cổng (UI-Screens CW-09). */
export const PAYMENT_RETURN_PARAM = "payment";
export const PAYMENT_RETURN_VALUE = "return";

/** Hỏi lại khoản thanh toán tối đa 5 lần, cách 2 giây (Frontend-Architecture mục 9) **(Đề xuất)**. */
export const PAYMENT_CHECK_ATTEMPTS = 5;
export const PAYMENT_CHECK_INTERVAL_MS = 2000;

/**
 * Tham số mã giao dịch cổng gắn vào URL trả về. Backend hiện chỉ nối VNPAY (`vnp_TxnRef`); khi nối MoMo thì thêm tham số
 * của MoMo vào đây.
 */
const GATEWAY_TXN_PARAMS = ["vnp_TxnRef"] as const;

const STORAGE_KEY = "ps-online-payment";

export type PendingOnlinePayment = {
  appointmentId: string;
  txnRef: string;
  gateway: PaymentGateway;
};

function isPendingOnlinePayment(value: unknown): value is PendingOnlinePayment {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.appointmentId === "string" &&
    typeof item.txnRef === "string" &&
    (item.gateway === "VNPAY" || item.gateway === "MoMo")
  );
}

/** Gọi ngay trước khi chuyển sang cổng. Trình duyệt chặn bộ nhớ phiên thì bỏ qua: khách vẫn xem được ở CW-09. */
export function rememberPendingPayment(pending: PendingOnlinePayment) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Không lưu được: khi quay về chỉ đưa khách tới “Lịch hẹn của tôi”.
  }
}

export function readPendingPayment(): PendingOnlinePayment | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isPendingOnlinePayment(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Không có bộ nhớ phiên: không có gì để xóa.
  }
}

/** Mã giao dịch cổng gắn vào URL trả về; không phải trang trả về thì `null`. */
export function gatewayTxnRefOf(params: URLSearchParams): string | null {
  for (const name of GATEWAY_TXN_PARAMS) {
    const value = params.get(name);
    if (value) return value;
  }
  return null;
}

/** CW-09 của giao dịch vừa quay về; giao dịch không phải do phiên này mở thì về “Lịch hẹn của tôi”. */
export function paymentReturnPath(txnRef: string, pending: PendingOnlinePayment | null) {
  if (!pending || pending.txnRef !== txnRef) return ROUTES.appointments;
  return `${ROUTES.appointmentDetail(pending.appointmentId)}?${PAYMENT_RETURN_PARAM}=${PAYMENT_RETURN_VALUE}`;
}
