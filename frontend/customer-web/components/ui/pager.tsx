import { Icon } from "@/components/icons";

type PagerProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
};

// Hiện tối đa 5 số trang quanh trang hiện tại.
const VISIBLE_PAGES = 5;

function visiblePages(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - Math.floor(VISIBLE_PAGES / 2), pageCount - VISIBLE_PAGES + 1));
  const end = Math.min(pageCount, start + VISIBLE_PAGES - 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const buttonClass =
  "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg border px-1 text-[13px] tabular-nums disabled:cursor-not-allowed disabled:opacity-40";

/** Phân trang theo `page`, `pageSize`, `total` của API (`.pager` của ui-demo). Ẩn khi chỉ có một trang. */
export function Pager({ page, pageSize, total, onChange, className = "" }: PagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Phân trang" className={`flex flex-wrap gap-1 ${className}`}>
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={`${buttonClass} border-line bg-white text-ink`}
      >
        <Icon name="chev-l" className="size-4" />
      </button>
      {visiblePages(page, pageCount).map((item) => (
        <button
          key={item}
          type="button"
          aria-label={`Trang ${item}`}
          aria-current={item === page ? "page" : undefined}
          onClick={() => onChange(item)}
          className={`${buttonClass} ${
            item === page ? "border-lagoon bg-lagoon font-semibold text-white" : "border-line bg-white text-ink"
          }`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={`${buttonClass} border-line bg-white text-ink`}
      >
        <Icon name="chev-r" className="size-4" />
      </button>
    </nav>
  );
}
