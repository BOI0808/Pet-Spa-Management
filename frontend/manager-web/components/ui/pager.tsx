import { Icon } from "@/components/icons";

type PagerProps = {
  /** Trang đang chọn, đếm từ 1. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

// Tối đa bấy nhiêu số trang hiển thị cùng lúc; nhiều hơn thì cửa sổ số trang trượt theo trang đang chọn.
// 5 số + 2 nút trước/sau rộng khoảng 250px nên vừa chân bảng ở 375px (Definition of Done: không cuộn ngang).
const MAX_VISIBLE_PAGES = 5;

function getVisiblePages(page: number, totalPages: number) {
  const count = Math.min(MAX_VISIBLE_PAGES, totalPages);
  const start = Math.min(Math.max(1, page - Math.floor(count / 2)), totalPages - count + 1);
  return Array.from({ length: count }, (_, index) => start + index);
}

const buttonClass =
  "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg border px-2 text-[13px] focus-visible:outline-[3px] focus-visible:outline-lagoon/40 disabled:cursor-not-allowed disabled:opacity-50";

/** Phân trang (`.pager` của ui-demo): nút trước/sau, số trang, trang hiện tại nền Lagoon. Ẩn khi chỉ có một trang. */
export function Pager({ page, totalPages, onChange }: PagerProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Phân trang" className="ml-auto flex max-w-full flex-wrap gap-1">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={`${buttonClass} border-line bg-white text-ink`}
      >
        <Icon name="chev-l" className="size-4" />
      </button>
      {getVisiblePages(page, totalPages).map((item) => (
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
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={`${buttonClass} border-line bg-white text-ink`}
      >
        <Icon name="chev-r" className="size-4" />
      </button>
    </nav>
  );
}
