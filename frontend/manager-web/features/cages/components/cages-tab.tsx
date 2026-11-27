import type { UseQueryResult } from "@tanstack/react-query";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, type ApiError } from "@/lib/api/errors";
import type { Cage, Page } from "@/lib/api/types";
import { getStoreToday } from "@/lib/time";
import { summarizeCages } from "../cage-status";
import { CageRow } from "./cage-row";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-3.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

type CagesTabProps = {
  /** Kết quả `useCages`. */
  query: UseQueryResult<Page<Cage>, ApiError>;
  onAdd: () => void;
  onEdit: (cage: Cage) => void;
};

/** Một thẻ số liệu của vùng 3 (`.kpi` của ui-demo, không bấm được). */
function StatTile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white px-[18px] py-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[28px] font-bold leading-[34px] tabular-nums">{value}</span>
      <span className="break-words text-xs leading-4 text-muted">{note}</span>
    </div>
  );
}

function CagesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

/**
 * Tab Chuồng của MW-07 – UI-Screens.md (FR-HTL-01, FR-HTL-02, FR-HTL-08): vùng 3 (4 thẻ số liệu) và vùng 4 (bảng chuồng kèm “Đang chứa”),
 * dựng từ `GET /cages`.
 */
export function CagesTab({ query, onAdd, onEdit }: CagesTabProps) {
  // Lần tải lại nền bị lỗi nhưng đã có dữ liệu thì vẫn giữ bảng cũ, chỉ báo lỗi khi chưa có gì để hiện.
  if (query.data === undefined) {
    if (query.isPending) return <CagesSkeleton />;
    if (isForbiddenError(query.error)) return <ForbiddenState />;
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={query.error} className="w-full" />
        <Button onClick={() => void query.refetch()}>Thử lại</Button>
      </div>
    );
  }

  const { items, total } = query.data;
  const summary = summarizeCages(items);
  const today = getStoreToday();

  return (
    <div className="flex flex-col gap-4">
      {total > items.length && (
        <Alert tone="info">
          Chỉ hiện {items.length} trong {total} chuồng đầu tiên nên các số liệu bên dưới chưa đủ.
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
        <StatTile label="Sức chứa" value={summary.capacity} note="chuồng đang sử dụng" />
        <StatTile
          label="Đang chứa"
          value={summary.occupied}
          note={summary.occupiedCodes.length > 0 ? summary.occupiedCodes.join(", ") : "chưa có chuồng nào"}
        />
        <StatTile label="Trống" value={summary.free} note="sẵn sàng nhận" />
        <StatTile label="Ngừng sử dụng" value={summary.inactive} note="không tính vào sức chứa" />
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon="grid"
            title="Chưa có chuồng nào"
            description="Thêm chuồng mới để tính vào sức chứa lưu trú."
            action={
              <Button variant="secondary" onClick={onAdd}>
                <Icon name="plus" />
                Thêm chuồng
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={headCellClass}>Mã</th>
                  <th className={headCellClass}>Loài</th>
                  <th className={headCellClass}>Nhóm</th>
                  <th className={headCellClass}>Tình trạng</th>
                  <th className={headCellClass}>Đang chứa</th>
                  <th className={`${headCellClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cage) => (
                  <CageRow key={cage.cageId} cage={cage} today={today} onEdit={() => onEdit(cage)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
