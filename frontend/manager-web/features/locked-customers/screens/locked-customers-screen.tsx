"use client";

// MW-09 Khách hàng bị khóa tự đặt lịch – UI-Screens.md (UC-22, FR-BOOK-06, 07; BR-15)
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { useLockedCustomers } from "@/lib/queries/customers";
import { UnlockBookingDialog } from "../components/unlock-booking-dialog";
import { LockedCustomerRow, cellClass } from "../components/locked-customer-row";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-3.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

function LockedCustomersSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, index) => (
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
            <Skeleton className="h-3.5 w-40" />
          </td>
          <td className={cellClass}>
            <Skeleton className="ml-auto h-8 w-24" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function LockedCustomersScreen() {
  const query = useLockedCustomers();
  const [unlocking, setUnlocking] = useState<Customer | null>(null);
  const customers = query.data?.items;

  // Vùng 1 – Tiêu đề; vùng 2 – Bảng; vùng 3 – Ghi chú.
  return (
    <>
      <div className="mb-6">
        <h1>Khách bị khóa tự đặt lịch</h1>
        <p className="mt-1 text-muted">
          Hệ thống tự khóa khi khách vắng mặt quá 3 lần trong 30 ngày. Gỡ khóa sau khi khách liên hệ hotline.
        </p>
      </div>

      {customers === undefined && query.isError ? (
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
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={headCellClass}>Khách hàng</th>
                  <th className={headCellClass}>Số điện thoại</th>
                  <th className={headCellClass}>Email</th>
                  <th className={`${headCellClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {customers ? (
                  customers.map((customer) => (
                    <LockedCustomerRow key={customer.customerId} customer={customer} onUnlock={() => setUnlocking(customer)} />
                  ))
                ) : (
                  <LockedCustomersSkeleton />
                )}
              </tbody>
            </table>
          </div>
          {customers?.length === 0 && (
            <EmptyState icon="lock" title="Không có khách nào bị khóa." description="Khách vắng mặt quá 3 lần trong 30 ngày sẽ hiện ở đây." />
          )}
        </Card>
      )}

      {query.data && query.data.total > query.data.items.length && (
        <Alert tone="info" className="mt-3">
          Đang hiển thị {query.data.items.length} trong {query.data.total} khách bị khóa.
        </Alert>
      )}

      <Alert tone="info" className="mt-4">
        Khi bị khóa, khách vẫn đặt lịch được qua lễ tân tại quầy hoặc hotline.
      </Alert>

      {unlocking && <UnlockBookingDialog customer={unlocking} onClose={() => setUnlocking(null)} />}
    </>
  );
}
