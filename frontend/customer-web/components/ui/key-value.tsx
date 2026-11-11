import type { ReactNode } from "react";

/** Dòng “nhãn – giá trị” căn hai bên (`.kv` của ui-demo). */
export function KeyValue({ label, children, muted = false }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-[7px]">
      <span className="shrink-0 text-muted">{label}</span>
      <span className={`min-w-0 break-words text-right font-medium ${muted ? "text-muted" : ""}`}>{children}</span>
    </div>
  );
}

export type DescriptionItem = { label: string; value: ReactNode };

/** Lưới nhãn 150px + giá trị (`.dl` của ui-demo); dưới 640px nhãn nằm trên giá trị. */
export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="m-0 grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-2.5 max-[640px]:grid-cols-1 max-[640px]:gap-y-0.5">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted max-[640px]:mt-2">{item.label}</dt>
          <dd className="m-0 break-words font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
