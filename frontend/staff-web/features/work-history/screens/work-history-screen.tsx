"use client";

// SW-12 Lịch sử công việc – UI-Screens.md, UC-11, FR-EXE-06. Chỉ nhân viên spa (`ROUTE_ROLES.workHistory`).
// Backend chỉ trả lịch được phân công cho chính nhân viên đang đăng nhập (BR-16), web không lọc thêm theo người.
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import { useAppointments } from "@/lib/queries/appointments";
import { WorkHistoryRow } from "../components/work-history-row";
import {
  HISTORY_FETCH_SIZE,
  HISTORY_PAGE_SIZE,
  formatMonth,
  listMonths,
  monthOf,
  pageCount,
} from "../work-history";

const TITLE = "Lịch sử công việc";
const DESCRIPTION = "Các lịch spa bạn đã thực hiện.";
const COLUMNS = ["Ngày", "Khung giờ", "Thú cưng", "Dịch vụ", "Trạng thái", "Thao tác"];

function TableSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải lịch sử công việc" className="flex flex-col gap-3 p-5">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  );
}

type PagerProps = { page: number; pages: number; onChange: (page: number) => void };

/** Nút số trang (`.pager` của ui-demo); trang đang xem có `aria-current`. */
function Pager({ page, pages, onChange }: PagerProps) {
  return (
    <nav aria-label="Phân trang" className="flex gap-1">
      {Array.from({ length: pages }, (_, index) => index + 1).map((value) => (
        <button
          key={value}
          type="button"
          aria-current={value === page ? "page" : undefined}
          aria-label={`Trang ${value}`}
          onClick={() => onChange(value)}
          className={`grid size-11 cursor-pointer place-items-center rounded-[10px] border text-sm font-semibold tabular-nums ${
            value === page ? "border-lagoon bg-lagoon text-white" : "border-line bg-white text-ink hover:border-lagoon"
          }`}
        >
          {value}
        </button>
      ))}
    </nav>
  );
}

export function WorkHistoryScreen() {
  const list = useAppointments({
    type: "Spa",
    status: "Completed",
    sort: "time_desc",
    page: 1,
    pageSize: HISTORY_FETCH_SIZE,
  });
  // `null` = chưa chọn: dùng tháng gần nhất có lịch.
  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const items = list.data?.items ?? [];
  const months = listMonths(items);
  // Tháng đã chọn không còn trong dữ liệu (tải lại sau 60 giây) thì về tháng gần nhất.
  const month = chosenMonth && months.includes(chosenMonth) ? chosenMonth : (months[0] ?? null);

  function changeMonth(next: string) {
    setChosenMonth(next);
    setPage(1);
  }

  // Ô chọn tháng chỉ hiện khi đã có lịch (G-06: lọc ở web trên các lịch đã tải).
  const monthSelect = month && (
    <>
      <label className="sr-only" htmlFor="work-history-month">
        Tháng
      </label>
      <select
        id="work-history-month"
        value={month}
        onChange={(event) => changeMonth(event.target.value)}
        className="h-11 w-[180px] cursor-pointer rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-[#a9c6cb] max-[640px]:w-full"
      >
        {months.map((value) => (
          <option key={value} value={value}>
            Tháng {formatMonth(value)}
          </option>
        ))}
      </select>
    </>
  );

  let content;
  if (list.isPending) {
    content = (
      <Card>
        <TableSkeleton />
      </Card>
    );
  } else if (list.isError && !list.data) {
    content = isForbiddenError(list.error) ? (
      <ForbiddenState />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={list.error} className="w-full" />
        <Button onClick={() => void list.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (!month) {
    content = (
      <Card>
        <EmptyState
          icon="history"
          title="Chưa có lịch spa nào hoàn tất."
          description="Lịch bạn thực hiện xong sẽ hiện ở đây."
        />
      </Card>
    );
  } else {
    const inMonth = items.filter((item) => monthOf(item) === month);
    const pages = pageCount(inMonth.length);
    const currentPage = Math.min(page, pages);
    const visible = inMonth.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE);
    // Còn lịch cũ hơn chưa tải (API chưa lọc theo tháng – G-06): báo để không hiểu nhầm là đã đủ.
    const truncated = list.data.total > items.length;

    content = (
      <Card className="overflow-hidden">
        {/* Bảng rộng hơn màn hẹp: cuộn ngang trong thẻ, trang không cuộn ngang (Design-System 6).
            `relative`: nhãn `sr-only` (position: absolute) của caption và cột thao tác phải nằm trong vùng cuộn này,
            nếu không chúng tràn ra ngoài và làm cả trang cuộn ngang ở màn hẹp. */}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Lịch spa đã hoàn tất trong tháng {formatMonth(month)}</caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b border-line bg-mist px-4 py-2.5 text-xs font-semibold text-muted ${
                      column === "Thao tác" ? "text-right" : ""
                    }`}
                  >
                    {column === "Thao tác" ? <span className="sr-only">{column}</span> : column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((appointment) => (
                <WorkHistoryRow key={appointment.appointmentId} appointment={appointment} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm text-muted">
          <span>
            {inMonth.length} lịch trong tháng {formatMonth(month)}
            {truncated && ` (đang xem ${items.length} lịch gần nhất)`}
          </span>
          {pages > 1 && <Pager page={currentPage} pages={pages} onChange={setPage} />}
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} actions={monthSelect || undefined} />
      {content}
    </>
  );
}
