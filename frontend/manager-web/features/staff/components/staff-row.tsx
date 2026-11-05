import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { StaffMember } from "@/lib/api/types";
import { formatPhone, getInitials } from "@/lib/format";
import { STAFF_ROLE_LABELS } from "@/lib/labels";

export const cellClass = "border-b border-line-soft px-3.5 py-3 align-middle";

type StaffRowProps = {
  staff: StaffMember;
  onEdit: () => void;
  onDeactivate: () => void;
};

/** Một dòng của bảng MW-08 (vùng 3). Nhân viên đã vô hiệu hóa hiển thị mờ, avatar xám. */
export function StaffRow({ staff, onEdit, onDeactivate }: StaffRowProps) {
  const avatarTone = !staff.isActive ? "muted" : staff.staffRole === "SpaStaff" ? "teal" : "apricot";

  return (
    // Rê chuột đổi nền cả dòng: `.table tbody tr:hover td` của ui-demo.
    <tr className={`[&:hover>td]:bg-[#F8FBFB] ${staff.isActive ? "" : "opacity-70"}`}>
      <td className={cellClass}>
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(staff.fullName)} tone={avatarTone} />
          <span className="whitespace-nowrap font-semibold">{staff.fullName}</span>
        </div>
      </td>
      <td className={`${cellClass} whitespace-nowrap tabular-nums`}>{formatPhone(staff.userName)}</td>
      <td className={`${cellClass} whitespace-nowrap`}>{STAFF_ROLE_LABELS[staff.staffRole]}</td>
      <td className={cellClass}>
        <Tag tone={staff.isActive ? "ok" : "default"}>{staff.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}</Tag>
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right`}>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Icon name="edit" />
          Sửa
        </Button>
        {staff.isActive && (
          <Button variant="ghost" size="sm" onClick={onDeactivate}>
            Vô hiệu hóa
          </Button>
        )}
      </td>
    </tr>
  );
}
