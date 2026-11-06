import { Fragment } from "react";
import { Icon } from "@/components/icons";

/** Thanh bước (`.stepper` của ui-demo). `current` tính từ 1. Dưới 640px chỉ hiện nhãn bước hiện tại. */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((label, index) => {
        const step = index + 1;
        const isDone = step < current;
        const isCurrent = step === current;
        const circleClass = isDone
          ? "border-success bg-success text-white"
          : isCurrent
            ? "border-lagoon bg-lagoon text-white shadow-[0_0_0_4px_var(--color-lagoon-50)]"
            : "border-line bg-white text-muted";

        return (
          <Fragment key={label}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className={`mx-3.5 h-0.5 min-w-7 flex-1 max-[640px]:mx-1.5 max-[640px]:min-w-3 ${
                  step <= current ? "bg-success" : "bg-line"
                }`}
              />
            )}
            <li
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap ${
                isCurrent ? "font-semibold text-ink" : isDone ? "font-medium text-ink" : "font-medium text-muted"
              }`}
            >
              <span
                className={`grid size-[30px] shrink-0 place-items-center rounded-full border-[1.5px] text-[13px] font-bold ${circleClass}`}
              >
                {isDone ? <Icon name="check" className="size-4" /> : step}
              </span>
              <span className={isCurrent ? undefined : "max-[640px]:sr-only"}>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
