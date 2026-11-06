import type { ReactNode } from "react";

type CardPartProps = { className?: string; children: ReactNode };

/** Thẻ nền trắng, viền `line`, bo 16px, không bóng (`.card` của ui-demo). */
export function Card({ className = "", children }: CardPartProps) {
  return <section className={`rounded-2xl border border-line bg-white ${className}`}>{children}</section>;
}

/** Đầu thẻ: tiêu đề H2 bên trái, phần phải tùy ý. */
export function CardHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4 max-[640px]:flex-wrap">
      <h2 className="flex-1">{title}</h2>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children }: CardPartProps) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

/** Chân thẻ chứa nút; nút chính đẩy sang phải bằng `ml-auto`. */
export function CardFooter({ className = "", children }: CardPartProps) {
  return (
    <div className={`flex items-center gap-2.5 border-t border-line-soft px-5 py-3.5 max-[640px]:flex-wrap ${className}`}>
      {children}
    </div>
  );
}
