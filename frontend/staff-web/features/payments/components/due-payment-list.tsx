"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { usePet } from "@/lib/queries/pets";
import { paymentsRoute } from "@/lib/routes";
import { describeDue, DUE_STUB_LABELS } from "../payments";
import type { DueItem } from "../use-due-payments";

function DueTicket({ item, today, selected }: { item: DueItem; today: string; selected: boolean }) {
  const { appointment, payment } = item;
  const pet = usePet(appointment.petId);
  // Cuống tím cho tiền lưu trú, phí trễ; cuống Lagoon cho spa – như phiếu ở SW-07 và `.t-stub.hotel` của ui-demo.
  const isHotel = appointment.type === "Hotel";
  return (
    <li>
      <Link
        href={paymentsRoute(appointment.appointmentId)}
        // `replace`: chọn khoản khác không chồng thêm mục lịch sử; `scroll: false` để danh sách không nhảy lên đầu.
        replace
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className={`grid grid-cols-[92px_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border bg-white text-ink transition-colors hover:border-[#9ec4c9] ${
          selected ? "border-lagoon shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line"
        }`}
      >
        <span
          className={`flex h-full flex-col items-center justify-center border-r border-dashed border-line px-1 py-2 text-center ${
            isHotel ? "bg-[#f1effc]" : "bg-lagoon-25"
          }`}
        >
          <b className={`text-[15px] tabular-nums ${isHotel ? "text-[#4a3fa6]" : "text-lagoon-700"}`}>
            {formatMoney(payment.amount)}
          </b>
          <span className="text-[11px] text-muted">{DUE_STUB_LABELS[payment.kind]}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2.5 px-3 py-2">
          {pet.isPending ? (
            <Skeleton className="size-[34px] rounded-[11px]" />
          ) : (
            <PetAvatar species={pet.data?.species ?? null} size="sm" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold">{appointment.petName ?? pet.data?.name ?? "Thú cưng"}</span>
            <span className="block text-xs text-muted">{describeDue(appointment, payment.kind, today)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

type DuePaymentListProps = {
  items: DueItem[];
  isPending: boolean;
  /** Lỗi tải (kèm nút thử lại); vẫn hiện các khoản đã tải được ở trên. */
  error: ReactNode;
  selectedId: string | null;
  today: string;
};

/** SW-09 vùng 1 – các khoản cần thu, phiếu đang chọn viền Lagoon. */
export function DuePaymentList({ items, isPending, error, selectedId, today }: DuePaymentListProps) {
  let content;
  if (isPending && items.length === 0) {
    content = (
      <div aria-busy="true" aria-label="Đang tải khoản cần thu" className="flex flex-col gap-2">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-[58px] rounded-xl" />
        ))}
      </div>
    );
  } else if (items.length === 0 && !error) {
    content = <p className="text-muted">Không có khoản cần thu.</p>;
  } else {
    content = (
      <div className="flex flex-col gap-3">
        {items.length > 0 && (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <DueTicket
                key={item.payment.paymentId}
                item={item}
                today={today}
                selected={item.appointment.appointmentId === selectedId}
              />
            ))}
          </ul>
        )}
        {error}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="Khoản cần thu">
        {!isPending && <span className="text-[13px] text-muted">{items.length} khoản</span>}
      </CardHeader>
      <CardBody className="p-3">{content}</CardBody>
    </Card>
  );
}
