import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import type { StaffSuggestion } from "@/lib/api/types";
import { getInitials } from "@/lib/format";
import { SuggestedTag } from "./suggested-tag";

type StaffOptionProps = {
  staff: StaffSuggestion;
  /** `radio` khi lịch cần 1 nhân viên, `checkbox` (ô vuông) khi cần 2 – UI-Screens MW-04 vùng 5. */
  mode: "radio" | "checkbox";
  /** Tên nhóm ô chọn; các lựa chọn cùng một lịch dùng chung một tên. */
  name: string;
  checked: boolean;
  /** Người nằm trong `suggested`: hiện thẻ “Hệ thống đề xuất”. */
  suggested: boolean;
  /** Đã chọn đủ số người cần thì khóa các ô còn lại; muốn đổi phải bỏ chọn một người trước. */
  disabled: boolean;
  onChange: () => void;
};

/**
 * Một lựa chọn nhân viên của MW-04 vùng 5 (`.staff-opt` của ui-demo): ô chọn, avatar, họ tên, thẻ đề xuất, số lịch trong 30 ngày.
 * Bọc ô radio/checkbox thật bị ẩn nên bàn phím dùng như ô chọn thường; trạng thái vẽ bằng `:checked` và `:disabled`.
 * Chưa có dòng ca làm, giờ rảnh và thẻ “Ngoài ca làm” vì API chưa trả (UI-Screens G-08).
 */
export function StaffOption({ staff, mode, name, checked, suggested, disabled, onChange }: StaffOptionProps) {
  return (
    <label className="grid min-w-0 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-[#A9C6CB] has-checked:border-lagoon has-checked:bg-lagoon-25 has-checked:shadow-[inset_0_0_0_1px_var(--color-lagoon)] has-disabled:cursor-not-allowed has-disabled:bg-mist has-disabled:opacity-60 has-disabled:hover:border-line has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon/40 max-[640px]:gap-2.5 max-[640px]:px-3">
      <input
        type={mode}
        name={name}
        value={staff.staffId}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      {mode === "radio" ? (
        <span
          aria-hidden="true"
          className="grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#9DB3B8] bg-white after:hidden after:size-[9px] after:rounded-full after:bg-lagoon peer-checked:border-lagoon peer-checked:after:block"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-[#9DB3B8] bg-white text-white peer-checked:border-lagoon peer-checked:bg-lagoon [&>svg]:hidden peer-checked:[&>svg]:block"
        >
          <Icon name="check" className="size-3" />
        </span>
      )}
      <Avatar initials={getInitials(staff.fullName)} tone="teal" />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="break-words font-semibold">{staff.fullName}</span>
        {suggested && <SuggestedTag />}
      </div>
      {staff.recentAssignmentCount !== undefined && (
        <div className="text-right">
          <span className="block text-[17px] font-bold leading-6 tabular-nums">{staff.recentAssignmentCount}</span>
          <span className="block text-[11px] leading-4 text-muted">lịch / 30 ngày</span>
        </div>
      )}
    </label>
  );
}
