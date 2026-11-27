import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/api/types";
import { formatPhone, getInitials } from "@/lib/format";

export const cellClass = "border-b border-line-soft px-3.5 py-3 align-middle";

type LockedCustomerRowProps = {
  customer: Customer;
  onUnlock: () => void;
};

/** Một dòng của bảng MW-09 (vùng 2). Chỉ có tên, số điện thoại, email: số lần vắng mặt và thời điểm khóa chưa có trong API (UI-Screens G-10). */
export function LockedCustomerRow({ customer, onUnlock }: LockedCustomerRowProps) {
  return (
    // Rê chuột đổi nền cả dòng: `.table tbody tr:hover td` của ui-demo.
    <tr className="[&:hover>td]:bg-[#F8FBFB]">
      <td className={cellClass}>
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(customer.fullName)} />
          <span className="break-words font-semibold">{customer.fullName}</span>
        </div>
      </td>
      <td className={`${cellClass} whitespace-nowrap tabular-nums`}>{formatPhone(customer.phone)}</td>
      <td className={`${cellClass} break-all`}>{customer.email ?? <span className="text-muted">–</span>}</td>
      <td className={`${cellClass} whitespace-nowrap text-right`}>
        <Button size="sm" onClick={onUnlock}>
          <Icon name="unlock" />
          Gỡ khóa
          <span className="sr-only"> tự đặt lịch của {customer.fullName}</span>
        </Button>
      </td>
    </tr>
  );
}
