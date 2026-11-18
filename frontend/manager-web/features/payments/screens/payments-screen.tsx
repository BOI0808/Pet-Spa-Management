"use client";

// MW-10 Thanh toán – UI-Screens.md (UC-23, UC-25, FR-PAY-02, FR-PAY-04; BR-07, BR-17)
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { Pager } from "@/components/ui/pager";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Payment, PaymentKind, PaymentMethod, PaymentStatus } from "@/lib/api/types";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { usePayments, useUnpaidSummary } from "@/lib/queries/payments";
import { ROUTES } from "@/lib/routes";
import { CounterPaymentDialog } from "../components/counter-payment-dialog";
import { PaymentRow, cellClass } from "../components/payment-row";
import { UnpaidKpiTile } from "../components/unpaid-kpi-tile";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-3.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

// Thứ tự chip theo UI-Screens MW-10 vùng 2.
const STATUS_CHIPS: readonly { status: PaymentStatus | undefined; label: string }[] = [
  { status: undefined, label: "Tất cả" },
  { status: "Unpaid", label: "Chưa thanh toán" },
  { status: "Paid", label: "Đã thanh toán" },
];
const KIND_ORDER: readonly PaymentKind[] = ["Spa", "Stay", "LateFee"];
const METHOD_ORDER: readonly PaymentMethod[] = ["Cash", "BankQR", "Online"];

/** `?status=` thiếu hoặc sai giá trị thì mở chip “Tất cả”. */
function parseStatus(value: string | null): PaymentStatus | undefined {
  return value === "Unpaid" || value === "Paid" ? value : undefined;
}

/** Chip “Tất cả” không cần tham số, giống MW-08. */
function statusHref(status: PaymentStatus | undefined) {
  return status ? `${ROUTES.payments}?status=${status}` : ROUTES.payments;
}

/** Nội dung trạng thái rỗng khi trang không có dòng nào để hiện. */
function getEmptyContent(status: PaymentStatus | undefined, total: number, itemCount: number) {
  if (total === 0) {
    if (status === "Unpaid") return { title: "Không có khoản chưa thanh toán", description: "Chưa có khoản nào cần thu." };
    if (status === "Paid") return { title: "Chưa có khoản đã thanh toán", description: "Các khoản đã thu sẽ hiện ở đây." };
    return { title: "Chưa có khoản thanh toán nào", description: "Các khoản thanh toán của lịch hẹn sẽ hiện ở đây." };
  }
  if (itemCount === 0) {
    return { title: "Trang này không còn khoản nào", description: "Chọn trang khác ở cuối bảng." };
  }
  return {
    title: "Không có khoản nào khớp bộ lọc",
    description: "Bộ lọc khoản và phương thức chỉ áp dụng cho các dòng của trang đang xem.",
  };
}

function PaymentsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index}>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-6 w-28" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className={cellClass} />
        </tr>
      ))}
    </>
  );
}

export function PaymentsScreen() {
  const router = useRouter();
  const status = parseStatus(useSearchParams().get("status"));

  // Trang đang xem gắn với chip trạng thái lúc chọn: `?status=` đổi (kể cả từ liên kết ở nơi khác) thì tự về trang 1, không cần effect.
  const [pageState, setPageState] = useState<{ status: PaymentStatus | undefined; page: number }>({ status, page: 1 });
  const page = pageState.status === status ? pageState.page : 1;
  // Backend chưa lọc theo khoản và phương thức (G-07) nên hai bộ lọc này chỉ áp dụng cho các dòng của trang đang xem.
  const [kind, setKind] = useState<PaymentKind | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  /** Khoản đang mở hộp thoại ghi nhận tại quầy; `null` là đóng. */
  const [recording, setRecording] = useState<Payment | null>(null);

  // Phần tử cần nhận focus sau khi đóng hộp thoại: nút “Ghi nhận” đã mở bị gỡ khỏi DOM khi khoản thành “Đã thanh toán”
  // nên Overlay không trả focus được.
  const focusAfterCloseRef = useRef<string | null>(null);

  useEffect(() => {
    if (recording !== null) return;
    const targetId = focusAfterCloseRef.current;
    if (!targetId) return;
    focusAfterCloseRef.current = null;
    document.getElementById(targetId)?.focus();
  }, [recording]);

  const paymentsQuery = usePayments(status, page);
  const summaryQuery = useUnpaidSummary();
  const data = paymentsQuery.data;
  const summary = summaryQuery.data;

  const rows = data?.items.filter((item) => (kind === "" || item.kind === kind) && (method === "" || item.method === method));
  const hasWebFilter = kind !== "" || method !== "";
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const firstRowNumber = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const emptyContent = data && rows?.length === 0 ? getEmptyContent(status, data.total, data.items.length) : null;

  function selectStatus(next: PaymentStatus | undefined) {
    setPageState({ status: next, page: 1 });
    router.replace(statusHref(next), { scroll: false });
  }

  function goToPage(next: number) {
    setPageState({ status, page: next });
  }

  function handleRecorded() {
    focusAfterCloseRef.current = `payments-chip-${status ?? "all"}`;
    // Ở chip “Chưa thanh toán” khoản vừa thu rời khỏi danh sách; nếu đó là dòng cuối của một trang sau trang 1 thì lùi một trang.
    if (status === "Unpaid" && page > 1 && data !== undefined && data.items.length <= 1) goToPage(page - 1);
  }

  // Vùng 1 – Thẻ số liệu; vùng 2 – Bộ lọc; vùng 3 – Bảng; vùng 4 – Chân bảng.
  return (
    <>
      <div className="mb-6">
        <h1>Thanh toán</h1>
        <p className="mt-1 text-muted">Tình trạng từng khoản thanh toán của các lịch hẹn.</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        <UnpaidKpiTile summary={summary} isError={summaryQuery.isError} />
      </div>

      {data === undefined && paymentsQuery.isError ? (
        isForbiddenError(paymentsQuery.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={paymentsQuery.error} className="w-full" />
            <Button onClick={() => void paymentsQuery.refetch()}>Thử lại</Button>
          </div>
        )
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
            <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
              {STATUS_CHIPS.map((chip) => {
                const isActive = chip.status === status;
                return (
                  // `.chip`, `.chip.is-active` của ui-demo: nút tròn, đang chọn thì nền Ink; số đếm đổi màu theo.
                  <button
                    key={chip.status ?? "all"}
                    id={`payments-chip-${chip.status ?? "all"}`}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectStatus(chip.status)}
                    className={`inline-flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium focus-visible:outline-[3px] focus-visible:outline-lagoon/40 ${
                      isActive ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-[#A9C6CB]"
                    }`}
                  >
                    {chip.label}
                    {chip.status === "Unpaid" && summary && (
                      <span className={`text-xs font-semibold ${isActive ? "text-[#A9C4C9]" : "text-muted"}`}>{summary.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="w-[170px] max-[640px]:w-full">
              <Select
                compact
                aria-label="Lọc theo loại khoản"
                value={kind}
                onChange={(event) => setKind(event.target.value as PaymentKind | "")}
              >
                <option value="">Mọi khoản</option>
                {KIND_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {PAYMENT_KIND_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-[190px] max-[640px]:w-full">
              <Select
                compact
                aria-label="Lọc theo phương thức"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod | "")}
              >
                <option value="">Mọi phương thức</option>
                {METHOD_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {PAYMENT_METHOD_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {emptyContent ? (
            <EmptyState icon="wallet" title={emptyContent.title} description={emptyContent.description} />
          ) : (
            <div
              className={`overflow-x-auto ${paymentsQuery.isPlaceholderData ? "opacity-60" : ""}`}
              aria-busy={paymentsQuery.isPlaceholderData || undefined}
            >
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={headCellClass}>Lịch hẹn</th>
                    <th className={headCellClass}>Khoản</th>
                    <th className={headCellClass}>Số tiền</th>
                    <th className={headCellClass}>Trạng thái</th>
                    <th className={headCellClass}>Ghi nhận</th>
                    <th className={headCellClass}>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {rows ? rows.map((item) => <PaymentRow key={item.paymentId} payment={item} onRecord={setRecording} />) : <PaymentsTableSkeleton />}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-4 py-3 text-[13px] text-muted">
              <span>
                {data.items.length > 0
                  ? `Hiển thị ${firstRowNumber} – ${firstRowNumber + data.items.length - 1} trong ${data.total} khoản`
                  : `${data.total} khoản`}
              </span>
              <Pager page={page} totalPages={totalPages} onChange={goToPage} />
            </div>
          )}
        </Card>
      )}

      {hasWebFilter && (
        <p className="mt-3 text-xs text-muted">Bộ lọc khoản và phương thức chỉ áp dụng cho các dòng của trang đang xem.</p>
      )}
      <p className="mt-3 text-xs text-muted">
        Lịch spa chỉ phát sinh khoản thanh toán khi hoàn tất. Lịch lưu trú có tối đa 2 khoản: tiền lưu trú và phí trả muộn.
      </p>

      {recording && (
        <CounterPaymentDialog
          key={recording.paymentId}
          payment={recording}
          onRecorded={handleRecorded}
          onClose={() => setRecording(null)}
        />
      )}
    </>
  );
}
