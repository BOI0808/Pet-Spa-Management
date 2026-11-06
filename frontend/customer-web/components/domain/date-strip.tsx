import { formatDayMonth, formatWeekdayDayMonth, formatWeekdayShort } from "@/lib/format";

type DateStripProps = {
  /** Tên nhóm radio. */
  name: string;
  label: string;
  /** Các ngày “YYYY-MM-DD”. */
  dates: string[];
  value: string;
  onChange: (date: string) => void;
};

/** Dải ngày cuộn ngang (`.date-strip`, `.date-chip` của ui-demo), bọc radio thật để dùng được bàn phím. */
export function DateStrip({ name, label, dates, value, onChange }: DateStripProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {dates.map((date) => (
        <label
          key={date}
          className="relative w-[78px] flex-none cursor-pointer rounded-xl border border-line bg-white py-2.5 text-center text-ink transition-colors hover:border-[#A9C6CB] has-checked:border-lagoon has-checked:bg-lagoon has-checked:text-white has-focus-visible:outline-3 has-focus-visible:-outline-offset-3 has-focus-visible:outline-lagoon/40"
        >
          <input
            type="radio"
            name={name}
            value={date}
            checked={date === value}
            onChange={() => onChange(date)}
            aria-label={formatWeekdayDayMonth(date)}
            className="peer sr-only"
          />
          <span className="block text-xs leading-4 text-muted peer-checked:text-[#BFE3E6]">
            {formatWeekdayShort(date)}
          </span>
          <span className="block text-[17px] font-bold leading-6 tabular-nums">{formatDayMonth(date)}</span>
        </label>
      ))}
    </div>
  );
}
