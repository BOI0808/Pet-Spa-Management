import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { formatPhone, getInitials } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { ServingCustomer } from "@/lib/serving-customer";

/**
 * SW-06 vùng 1 – khách đang phục vụ (`.surface-soft` của ui-demo). Nhãn “Khách vãng lai” chỉ hiện khi biết chắc
 * (vừa ghi nhận ở SW-04): API tìm khách không cho biết khách có tài khoản hay không (UI-Screens G-05).
 */
export function ServingCustomerBar({ customer }: { customer: ServingCustomer }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-mist px-4 py-3">
      <Avatar initials={getInitials(customer.fullName)} />
      <div className="min-w-0 flex-1">
        <div className="break-words font-semibold">{customer.fullName}</div>
        <div className="text-[13px] tabular-nums text-muted">{formatPhone(customer.phone)}</div>
      </div>
      {customer.isWalkIn && <Tag tone="walkin">Khách vãng lai</Tag>}
      <ButtonLink href={ROUTES.customers} variant="ghost" size="sm">
        Đổi khách
      </ButtonLink>
    </div>
  );
}
