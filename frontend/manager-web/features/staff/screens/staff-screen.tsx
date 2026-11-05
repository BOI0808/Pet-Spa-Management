"use client";

// MW-08 Nhân viên – UI-Screens.md (UC-26, FR-STF-01 → 03, BR-27)
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { StaffMember } from "@/lib/api/types";
import { useStaff } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";
import { DeactivateStaffDialog } from "../components/deactivate-staff-dialog";
import { StaffFormDrawer } from "../components/staff-form-drawer";
import { StaffRow, cellClass } from "../components/staff-row";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-3.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

type StaffFilter = "all" | "spa" | "receptionist" | "inactive";

/** Đang mở ngăn kéo thêm (`"new"`) hoặc sửa một nhân viên; `null` là đóng. */
type DrawerState = "new" | StaffMember | null;

// Thứ tự chip theo UI-Screens MW-08 vùng 2. Lọc ở web: backend trả cả người đã vô hiệu hóa.
const FILTERS: readonly { key: StaffFilter; label: string; matches: (staff: StaffMember) => boolean }[] = [
  { key: "all", label: "Tất cả", matches: () => true },
  { key: "spa", label: "Nhân viên spa", matches: (staff) => staff.staffRole === "SpaStaff" },
  { key: "receptionist", label: "Lễ tân", matches: (staff) => staff.staffRole === "Receptionist" },
  { key: "inactive", label: "Đã vô hiệu hóa", matches: (staff) => !staff.isActive },
];

/** `?filter=` thiếu hoặc sai giá trị thì mở chip "Tất cả". */
function parseFilter(value: string | null): StaffFilter {
  return FILTERS.find((item) => item.key === value)?.key ?? "all";
}

/** Chip "Tất cả" không cần tham số, giống tab Chuồng của MW-07. */
function filterHref(filter: StaffFilter) {
  return filter === "all" ? ROUTES.staff : `${ROUTES.staff}?filter=${filter}`;
}

function StaffTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index}>
          <td className={cellClass}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-6 w-28" />
          </td>
          <td className={cellClass}>
            <Skeleton className="ml-auto h-8 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function StaffScreen() {
  const staffQuery = useStaff();
  const router = useRouter();
  const filter = parseFilter(useSearchParams().get("filter"));
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [deactivating, setDeactivating] = useState<StaffMember | null>(null);

  const staff = staffQuery.data?.items;
  const activeSpaCount = staff?.filter((item) => item.isActive && item.staffRole === "SpaStaff").length ?? 0;
  const activeReceptionistCount = staff?.filter((item) => item.isActive && item.staffRole === "Receptionist").length ?? 0;
  const activeFilter = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  const visibleStaff = staff?.filter(activeFilter.matches);

  const addButton = (
    <Button variant="primary" onClick={() => setDrawer("new")}>
      <Icon name="user-plus" />
      Thêm nhân viên
    </Button>
  );

  // Vùng 1 – Tiêu đề; vùng 2 – Lọc nhanh; vùng 3 – Bảng; vùng 4 – Ghi chú.
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Nhân viên</h1>
          <p className="mt-1 text-muted">
            {staff && `${activeSpaCount} nhân viên spa và ${activeReceptionistCount} lễ tân đang hoạt động.`}
          </p>
        </div>
        {addButton}
      </div>

      {staff === undefined && staffQuery.isError ? (
        isForbiddenError(staffQuery.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={staffQuery.error} className="w-full" />
            <Button onClick={() => void staffQuery.refetch()}>Thử lại</Button>
          </div>
        )
      ) : staff?.length === 0 ? (
        <Card>
          <EmptyState
            icon="users"
            title="Chưa có nhân viên nào"
            description="Thêm tài khoản lễ tân hoặc nhân viên spa đầu tiên."
            action={<Button onClick={() => setDrawer("new")}>Thêm nhân viên</Button>}
          />
        </Card>
      ) : (
        <>
          {staff && (
            <div role="group" aria-label="Lọc nhân viên" className="mb-4 flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const isActive = item.key === filter;
                return (
                  // `.chip`, `.chip.is-active` của ui-demo: nút tròn, đang chọn thì nền Ink; số đếm đổi màu theo.
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => router.replace(filterHref(item.key), { scroll: false })}
                    className={`inline-flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium focus-visible:outline-[3px] focus-visible:outline-lagoon/40 ${
                      isActive ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-[#A9C6CB]"
                    }`}
                  >
                    {item.label}
                    <span className={`text-xs font-semibold ${isActive ? "text-[#A9C4C9]" : "text-muted"}`}>
                      {staff.filter(item.matches).length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Card>
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={headCellClass}>Nhân viên</th>
                    <th className={headCellClass}>Số điện thoại (đăng nhập)</th>
                    <th className={headCellClass}>Vai trò</th>
                    <th className={headCellClass}>Trạng thái</th>
                    <th className={`${headCellClass} text-right`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {visibleStaff ? (
                    visibleStaff.map((item) => (
                      <StaffRow
                        key={item.staffId}
                        staff={item}
                        onEdit={() => setDrawer(item)}
                        onDeactivate={() => setDeactivating(item)}
                      />
                    ))
                  ) : (
                    <StaffTableSkeleton />
                  )}
                </tbody>
              </table>
            </div>
            {visibleStaff?.length === 0 && (
              <EmptyState
                icon="users"
                title="Không có nhân viên nào"
                description="Chưa có nhân viên nào thuộc mục này."
              />
            )}
          </Card>
        </>
      )}

      <p className="mt-3 text-xs text-muted">
        Màn hình này chỉ tạo tài khoản lễ tân và nhân viên spa. Lịch làm việc của nhân viên spa đặt tại{" "}
        <Link href={ROUTES.workShifts} className="font-semibold text-lagoon-700 underline">
          Lịch làm việc
        </Link>
        .
      </p>

      {drawer !== null && (
        <StaffFormDrawer staff={drawer === "new" ? null : drawer} onClose={() => setDrawer(null)} />
      )}
      {deactivating && <DeactivateStaffDialog staff={deactivating} onClose={() => setDeactivating(null)} />}
    </>
  );
}
