import { Icon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

type ServiceOptionProps = {
  name: string;
  durationMinutes: number;
  /** “HH:mm”. */
  latestStartTime: string;
  price: number;
  checked: boolean;
  onChange: () => void;
};

/** Thẻ chọn dịch vụ (`.svc` của ui-demo), bọc ô kiểm thật bị ẩn. */
export function ServiceOption({
  name,
  durationMinutes,
  latestStartTime,
  price,
  checked,
  onChange,
}: ServiceOptionProps) {
  return (
    <label className="relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-[#A9C6CB] has-checked:border-lagoon has-checked:bg-lagoon-25 has-checked:shadow-[inset_0_0_0_1px_var(--color-lagoon)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon/40">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="grid size-5 place-items-center rounded-md border-[1.5px] border-[#9DB3B8] bg-white text-white peer-checked:border-lagoon peer-checked:bg-lagoon"
      >
        <Icon name="check" className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block break-words font-semibold">{name}</span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs leading-4 text-muted">
          <span>{durationMinutes} phút</span>
          <span>Nhận đến {latestStartTime}</span>
        </span>
      </span>
      <span className="text-right font-bold tabular-nums">{formatMoney(price)}</span>
    </label>
  );
}
