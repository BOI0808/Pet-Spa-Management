import type { SlotInfo } from "@/lib/api/types";
import { SLOT_GROUP_LABELS, SLOT_GROUP_ORDER } from "@/lib/labels";

type SlotPickerProps = {
  /** Tên nhóm radio. */
  name: string;
  label: string;
  slots: SlotInfo[];
  value: string | null;
  /** Giờ kết thúc của mốc đang chọn, hiện trên chính mốc đó. */
  endTime?: string;
  /** Mốc đã trôi qua không chọn được dù API trả `Available`. */
  isPast: (time: string) => boolean;
  onChange: (time: string) => void;
};

// `.slot` của ui-demo. Mốc đã qua dùng chung kiểu với mốc kín.
const SLOT_BASE =
  "relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 text-center transition-colors";
const SLOT_AVAILABLE =
  "cursor-pointer border-line bg-white text-ink hover:border-lagoon has-checked:border-lagoon has-checked:bg-lagoon has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon/40";
const SLOT_FULL = "cursor-not-allowed border-dashed border-line bg-[#F7FAFA] text-[#97A9AD]";
const SLOT_NOT_ACCEPTED = "cursor-not-allowed border-[#F0D9A6] bg-[#FFF6E0] text-apricot-700";

type SlotOptionProps = Omit<SlotPickerProps, "label" | "slots"> & { slot: SlotInfo };

function SlotOption({ name, slot, value, endTime, isPast, onChange }: SlotOptionProps) {
  const { time, status } = slot;
  const selected = time === value;

  let boxClass = SLOT_AVAILABLE;
  let note = selected && endTime ? `kết thúc ${endTime}` : "còn chỗ";
  if (status === "Full") {
    boxClass = SLOT_FULL;
    note = "Đã kín";
  } else if (status === "NotAccepted") {
    boxClass = SLOT_NOT_ACCEPTED;
    note = "không nhận dịch vụ";
  } else if (isPast(time)) {
    boxClass = SLOT_FULL;
    note = "Đã qua";
  }
  const isAvailable = boxClass === SLOT_AVAILABLE;

  return (
    <label className={`${SLOT_BASE} ${boxClass}`}>
      <input
        type="radio"
        name={name}
        value={time}
        checked={isAvailable && selected}
        disabled={!isAvailable}
        onChange={() => onChange(time)}
        aria-label={`${time}, ${note}`}
        className="peer sr-only"
      />
      <b className={`text-[15px] leading-5 tabular-nums ${boxClass === SLOT_FULL ? "line-through decoration-1" : ""}`}>
        {time}
      </b>
      <small className={`text-[11px] leading-[14px] ${isAvailable ? "text-muted peer-checked:text-[#CBEAEC]" : ""}`}>
        {note}
      </small>
    </label>
  );
}

const LEGEND = [
  { label: "Còn chỗ", className: "border-line bg-white" },
  { label: "Đang chọn", className: "border-lagoon bg-lagoon" },
  { label: "Đã kín / Đã qua", className: "border-dashed border-line bg-[#F7FAFA]" },
  { label: "Không nhận dịch vụ đã chọn", className: "border-[#F0D9A6] bg-[#FFF6E0]" },
];

/** Mốc giờ theo nhóm Sáng / Trưa / Chiều, tối (`.slot-group`, `.slot`, `.slot-legend` của ui-demo). */
export function SlotPicker({ label, slots, ...option }: SlotPickerProps) {
  const groups = SLOT_GROUP_ORDER.map((group) => ({
    group,
    slots: slots.filter((slot) => slot.group === group),
  })).filter((item) => item.slots.length > 0);

  return (
    <>
      <div role="radiogroup" aria-label={label}>
        {groups.map((item) => (
          <div
            key={item.group}
            className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3 border-t border-line-soft py-3.5 first:border-t-0 first:pt-1 max-[640px]:grid-cols-1"
          >
            <div className="pt-2.5 font-semibold max-[640px]:pt-0">{SLOT_GROUP_LABELS[item.group]}</div>
            <div className="grid grid-cols-5 gap-2 max-[640px]:grid-cols-3">
              {item.slots.map((slot) => (
                <SlotOption key={slot.time} slot={slot} {...option} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className={`inline-block size-3.5 rounded border ${item.className}`} />
            {item.label}
          </span>
        ))}
      </div>
    </>
  );
}
