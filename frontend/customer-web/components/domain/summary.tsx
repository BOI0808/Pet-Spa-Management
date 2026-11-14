import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";

/** Một mục có số tiền (`.sum-line` của ui-demo). */
export function SumLine({ label, note, amount }: { label: string; note?: string; amount: number }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="break-words">{label}</div>
        {note && <div className="text-xs leading-4 text-muted">{note}</div>}
      </div>
      <span className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(amount)}</span>
    </div>
  );
}

/** Dòng thông tin nhãn – giá trị (`.kv` của ui-demo). */
export function SumFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-[3px]">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** Tổng tiền + chú thích (`.sum-total` của ui-demo); `amount = null` (chưa tính được) hiện “–” thay cho 0đ. */
export function SumTotal({ label, amount, note }: { label: string; amount: number | null; note?: string }) {
  return (
    <div className="mt-1.5 grid grid-cols-[1fr_auto] items-baseline gap-x-3 border-t border-dashed border-line pt-3.5">
      <div className="font-semibold">{label}</div>
      <span className="whitespace-nowrap text-right text-[22px] font-bold leading-7 tabular-nums">
        {amount === null ? "–" : formatMoney(amount)}
      </span>
      {note && <div className="col-span-full mt-0.5 text-xs leading-4 text-muted">{note}</div>}
    </div>
  );
}
