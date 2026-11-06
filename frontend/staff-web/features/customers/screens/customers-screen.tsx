"use client";

// SW-04 Khách hàng: tìm, ghi nhận khách vãng lai – UI-Screens.md mục 4 (FR-ACC-04)
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhone } from "@/lib/format";
import { useCustomerSearch } from "@/lib/queries/customers";
import { ROUTES, customerSearchRoute } from "@/lib/routes";
import { CustomerCard } from "../components/customer-card";
import { WalkInForm } from "../components/walk-in-form";
import { isFullPhone, toSearchTerm } from "../forms";

// Kết quả tìm theo một phần số có thể nhiều; 20 khách đầu là đủ để lễ tân nhận ra, còn lại thì gõ thêm số.
const PAGE_SIZE = 20;

/** Vùng 1 – Ô tìm cao 48px theo ui-demo; Enter hoặc nút “Tìm khách” đều tìm. */
function SearchBox({ initialValue, onSearch }: { initialValue: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initialValue);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(value);
  };

  return (
    <Card className="mb-4 p-5">
      <form role="search" onSubmit={submit} className="flex gap-3 max-[640px]:flex-col">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-[15px] size-[18px] text-muted" />
          <label htmlFor="customer-search" className="sr-only">
            Số điện thoại của khách
          </label>
          <input
            id="customer-search"
            type="search"
            inputMode="tel"
            autoComplete="off"
            placeholder="Nhập số điện thoại của khách"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-12 w-full rounded-[10px] border border-line bg-white pl-[42px] pr-3 text-base text-ink tabular-nums hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)] focus:outline-none"
          />
        </div>
        <Button type="submit" size="lg">
          Tìm khách
        </Button>
      </form>
    </Card>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tìm khách" className="flex flex-col gap-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

/** Vùng 2 → 4 theo kết quả tìm. `search` là số đã chuẩn hóa, khác rỗng. */
function SearchResults({ search }: { search: string }) {
  const router = useRouter();
  const result = useCustomerSearch({ search, page: 1, pageSize: PAGE_SIZE });
  // Bấm “Hủy bỏ” ở form khách vãng lai thì ẩn form, giữ kết quả tìm.
  const [walkInDismissed, setWalkInDismissed] = useState(false);

  if (result.isPending) return <ResultsSkeleton />;
  if (result.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={result.error} className="w-full" />
        <Button onClick={() => void result.refetch()}>Thử lại</Button>
      </div>
    );
  }

  const { items, total } = result.data;
  // Chỉ mời ghi nhận khách vãng lai khi đã gõ đủ số và chưa khách nào có đúng số đó.
  const canCreateWalkIn = isFullPhone(search) && !items.some((customer) => customer.phone === search);

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        // Vùng 3 – Không tìm thấy (`.alert-neutral` của ui-demo).
        <div role="status" className="flex items-start gap-3 rounded-xl border border-line bg-mist px-4 py-3.5 leading-5">
          <Icon name="search" className="mt-px size-[18px] shrink-0 text-muted" />
          <div>
            Không tìm thấy khách nào với số <b className="tabular-nums">{formatPhone(search)}</b>.
            {canCreateWalkIn
              ? " Bạn có thể ghi nhận khách vãng lai bên dưới."
              : " Nhập đủ 10 chữ số để tìm chính xác hoặc ghi nhận khách vãng lai."}
          </div>
        </div>
      ) : (
        <>
          {total > items.length && (
            <p className="text-muted">
              Hiển thị {items.length} trong {total} khách có số chứa “{search}”. Nhập thêm số để thu hẹp.
            </p>
          )}
          {items.map((customer) => (
            <CustomerCard key={customer.customerId} customer={customer} />
          ))}
        </>
      )}

      {canCreateWalkIn && !walkInDismissed && (
        // `key`: tìm số khác thì form mới, ô Số điện thoại điền lại theo số vừa tìm.
        <WalkInForm key={search} initialPhone={search} onCancel={() => setWalkInDismissed(true)} />
      )}
      {canCreateWalkIn && walkInDismissed && (
        <div>
          <Button onClick={() => setWalkInDismissed(false)} className="min-h-11">
            Ghi nhận khách vãng lai
          </Button>
        </div>
      )}
      {/* Tìm số khác thì xóa ô tìm và về trạng thái ban đầu. */}
      {items.length === 0 && !canCreateWalkIn && (
        <div>
          <Button variant="ghost" onClick={() => router.replace(ROUTES.customers)} className="min-h-11">
            Xóa tìm kiếm
          </Button>
        </div>
      )}
    </div>
  );
}

/** `/khach-hang?search=` – từ khóa lưu trên URL để nút Quay lại hoạt động (Frontend-Architecture 4.1). */
export function CustomersScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = toSearchTerm(searchParams.get("search") ?? "");

  return (
    <>
      <PageHeader title="Khách hàng" description="Tìm theo số điện thoại trước khi ghi nhận khách mới." />
      {/* `key`: Quay lại về từ khóa khác thì ô tìm hiện đúng từ khóa đó. */}
      <SearchBox
        key={`search-${search}`}
        initialValue={formatPhone(search)}
        // Đổi bộ lọc dùng replace, không thêm lịch sử (Frontend-Architecture 4.1).
        onSearch={(value) => router.replace(customerSearchRoute(toSearchTerm(value)))}
      />
      {/* `key` khác ô tìm (cùng cấp): tìm số khác thì kết quả, form khách vãng lai làm mới từ đầu. */}
      {search && <SearchResults key={`results-${search}`} search={search} />}
    </>
  );
}
