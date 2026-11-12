import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

type Crumb = { label: string; href?: string };

/** Đường dẫn phía trên tiêu đề (`.crumb` của ui-demo); mục cuối là trang hiện tại (không có `href`). */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        {items.map((crumb, index) => (
          <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <Icon name="chev-r" className="size-3.5" />}
            {crumb.href ? (
              <Link href={crumb.href} className="text-muted hover:text-lagoon">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="break-words">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Đường dẫn phía trên tiêu đề; mục cuối là trang hiện tại (không có `href`). */
  breadcrumb?: Crumb[];
  /** Nút bên phải tiêu đề, ví dụ nút chính “Thêm thú cưng”. */
  actions?: ReactNode;
};

/** Đầu trang: đường dẫn + tiêu đề H1 + mô tả + thao tác (`.crumb`, `.page-head` của ui-demo). */
export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <>
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 basis-[260px]">
          <h1 className="break-words">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {actions}
      </div>
    </>
  );
}
