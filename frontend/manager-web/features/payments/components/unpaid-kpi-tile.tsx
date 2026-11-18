import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import type { UnpaidSummary } from "@/lib/queries/payments";

type UnpaidKpiTileProps = {
  /** `undefined` khi chưa tải xong hoặc tải lỗi. */
  summary: UnpaidSummary | undefined;
  isError: boolean;
};

function getSubline(summary: UnpaidSummary) {
  if (summary.count === 0) return "Không có khoản nào cần thu.";
  if (summary.isPartial) return `${formatMoney(summary.amount)} trong ${summary.loadedCount} khoản đầu tiên`;
  return formatMoney(summary.amount);
}

/** Thẻ số liệu “Chưa thanh toán” của MW-10 vùng 1 (`.kpi.accent` của ui-demo): số khoản và tổng tiền. G-07: tạm chỉ có thẻ này. */
export function UnpaidKpiTile({ summary, isError }: UnpaidKpiTileProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-[#F1D9A2] bg-apricot-50 px-[18px] py-4">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Icon name="hourglass" className="size-[18px] text-[#B87400]" />
        Chưa thanh toán
      </div>
      <div className="text-[28px] font-bold leading-[34px] tabular-nums">
        {summary ? summary.count : isError ? "–" : <Skeleton className="h-[34px] w-12" />}
      </div>
      <div className="text-xs leading-4 text-muted">
        {summary ? getSubline(summary) : isError ? "Chưa tải được số liệu." : <Skeleton className="h-4 w-32" />}
      </div>
    </div>
  );
}
