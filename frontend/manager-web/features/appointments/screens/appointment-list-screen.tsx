"use client";

// MW-03 Danh sách lịch hẹn – UI-Screens.md (UC-11; FR-EXE-08). Lịch spa và lưu trú của toàn cửa hàng, lọc bằng URL.
// Chưa làm: ô tìm theo mã/thú cưng/khách (API chưa có tham số tìm, G-06 chốt tạm ẩn), khoảng ngày (API chỉ nhận một ngày), cột Thanh toán.
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Pager } from "@/components/ui/pager";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
import { useAppointmentList } from "@/lib/queries/appointments";
import { AppointmentListRow, cellClass } from "../components/appointment-list-row";
import { APPOINTMENT_STATUS_ORDER, buildListHref, parseListFilters, type AppointmentListFilters } from "../list-params";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-2.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

function ListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <tr key={index}>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-8 w-36" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-8 w-24" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-6 w-24" />
          </td>
          <td className={cellClass} />
        </tr>
      ))}
    </>
  );
}

export function AppointmentListScreen() {
  const router = useRouter();
  const filters = parseListFilters(useSearchParams());
  const { type, status, date, page } = filters;
  const hasFilter = Boolean(type || status || date);

  const query = useAppointmentList({ type, status, date, page });
  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const firstRowNumber = data ? (data.page - 1) * data.pageSize + 1 : 0;

  /** Đổi bộ lọc thì về trang 1; chỉ đổi trang thì giữ nguyên bộ lọc. */
  function navigate(next: Partial<AppointmentListFilters>, keepPage = false) {
    router.replace(buildListHref({ ...filters, page: keepPage ? page : 1, ...next }), { scroll: false });
  }

  function getEmptyContent() {
    if (data === undefined) return null;
    if (data.total === 0) {
      return hasFilter
        ? { title: "Không có lịch hẹn nào khớp bộ lọc", description: "Thử đổi hoặc xóa bộ lọc để xem lịch khác." }
        : { title: "Chưa có lịch hẹn nào", description: "Lịch spa và lưu trú khách đặt sẽ hiện ở đây." };
    }
    if (data.items.length === 0) {
      return { title: "Trang này không còn lịch hẹn", description: "Danh sách đã thay đổi, hãy quay về trang đầu." };
    }
    return null;
  }

  const emptyContent = getEmptyContent();

  // Vùng 1 – Bộ lọc; vùng 2 – Bảng; vùng 3 – Chân bảng.
  return (
    <>
      <div className="mb-6">
        <h1>Lịch hẹn</h1>
        <p className="mt-1 text-muted">Lịch spa và lưu trú của toàn cửa hàng.</p>
      </div>

      {data === undefined && query.isError ? (
        isForbiddenError(query.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={query.error} className="w-full" />
            <Button onClick={() => void query.refetch()}>Thử lại</Button>
          </div>
        )
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
            <div className="w-[150px] max-[640px]:w-full">
              <Select
                compact
                aria-label="Lọc theo loại lịch"
                value={type ?? ""}
                onChange={(event) => navigate({ type: event.target.value === "" ? undefined : (event.target.value as "Spa" | "Hotel") })}
              >
                <option value="">Mọi loại</option>
                <option value="Spa">{APPOINTMENT_TYPE_LABELS.Spa}</option>
                <option value="Hotel">{APPOINTMENT_TYPE_LABELS.Hotel}</option>
              </Select>
            </div>
            <div className="w-[170px] max-[640px]:w-full">
              <Select
                compact
                aria-label="Lọc theo trạng thái"
                value={status ?? ""}
                onChange={(event) =>
                  navigate({ status: APPOINTMENT_STATUS_ORDER.find((item) => item === event.target.value) })
                }
              >
                <option value="">Mọi trạng thái</option>
                {APPOINTMENT_STATUS_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {APPOINTMENT_STATUS_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-[170px] max-[640px]:w-full">
              <Input
                compact
                type="date"
                aria-label="Lọc theo ngày hẹn"
                value={date ?? ""}
                onChange={(event) => navigate({ date: event.target.value === "" ? undefined : event.target.value })}
              />
            </div>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={() => router.replace(buildListHref({ page: 1 }), { scroll: false })}>
                Xóa bộ lọc
              </Button>
            )}
            {data && <span className="ml-auto text-[13px] text-muted max-[640px]:ml-0">{data.total} lịch hẹn</span>}
          </div>

          {emptyContent ? (
            <EmptyState
              icon="list"
              title={emptyContent.title}
              description={emptyContent.description}
              action={
                data && data.total > 0 ? (
                  <Button onClick={() => navigate({ page: 1 }, true)}>Về trang đầu</Button>
                ) : hasFilter ? (
                  <Button onClick={() => router.replace(buildListHref({ page: 1 }), { scroll: false })}>Xóa bộ lọc</Button>
                ) : undefined
              }
            />
          ) : (
            <div
              className={`relative overflow-x-auto ${query.isPlaceholderData ? "opacity-60" : ""}`}
              aria-busy={query.isPlaceholderData || undefined}
            >
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={headCellClass}>Mã, loại</th>
                    <th className={headCellClass}>Thú cưng, khách hàng</th>
                    <th className={headCellClass}>Thời gian</th>
                    <th className={headCellClass}>Nhân viên / chuồng</th>
                    <th className={headCellClass}>Trạng thái</th>
                    <th className={headCellClass}>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {data ? data.items.map((item) => <AppointmentListRow key={item.appointmentId} appointment={item} />) : <ListSkeleton />}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && data.items.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-4 py-3 text-[13px] text-muted">
              <span>
                Hiển thị {firstRowNumber} – {firstRowNumber + data.items.length - 1} trong {data.total} lịch hẹn
              </span>
              <Pager page={page} totalPages={totalPages} onChange={(next) => navigate({ page: next }, true)} />
            </div>
          )}
        </Card>
      )}

      {date && (
        <p className="mt-3 text-xs text-muted">Lịch lưu trú hiện khi ngày nhận hoặc ngày trả nằm trong ngày đã chọn.</p>
      )}
    </>
  );
}
