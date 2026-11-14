import { Icon } from "@/components/icons";

export type LifecycleStepState = "done" | "current" | "todo" | "cancel";
export type LifecycleStep = { label: string; state: LifecycleStepState; time?: string };

// Đường nối: ngang từ tâm chấm này sang chấm sau; dưới 640px thành dọc.
function lineClass(state: LifecycleStepState, isFirst: boolean, isLast: boolean) {
  const horizontal = isLast ? "right-auto w-2.5" : "right-0";
  const color =
    state === "done"
      ? "bg-lagoon"
      : state === "current"
        ? "bg-[linear-gradient(90deg,var(--color-lagoon)_0_10px,var(--color-line)_10px)] max-[640px]:bg-line max-[640px]:bg-none"
        : "bg-line";
  return `absolute top-2.5 h-0.5 ${isFirst ? "left-2.5" : "left-0"} ${horizontal} ${color} max-[640px]:-bottom-2.5 max-[640px]:left-2 max-[640px]:right-auto max-[640px]:h-auto max-[640px]:w-0.5 ${
    isLast ? "max-[640px]:hidden" : ""
  }`;
}

const DOT_CLASS: Record<LifecycleStepState, string> = {
  done: "border-lagoon bg-lagoon",
  current: "border-lagoon bg-white shadow-[0_0_0_4px_var(--color-lagoon-50)]",
  todo: "border-line bg-white",
  cancel: "border-danger bg-danger",
};

/** Thanh các bước của lịch hẹn (`.lifecycle`, `.lc` của ui-demo); dưới 640px xếp dọc. */
export function Lifecycle({ steps, label }: { steps: LifecycleStep[]; label: string }) {
  return (
    <ol aria-label={label} className="grid auto-cols-fr grid-flow-col max-[640px]:auto-cols-auto max-[640px]:grid-flow-row">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative pt-[30px] max-[640px]:pb-3.5 max-[640px]:pl-[30px] max-[640px]:pt-0"
        >
          <span aria-hidden="true" className={lineClass(step.state, index === 0, index === steps.length - 1)} />
          <span
            aria-hidden="true"
            className={`absolute left-0 top-0.5 z-[1] grid size-[18px] place-items-center rounded-full border-2 text-white max-[640px]:top-px ${DOT_CLASS[step.state]}`}
          >
            {step.state === "done" && <Icon name="check" className="size-[11px]" strokeWidth={3} />}
            {step.state === "cancel" && <Icon name="x" className="size-[11px]" strokeWidth={3} />}
            {step.state === "current" && <span className="size-2 rounded-full bg-lagoon" />}
          </span>
          <span
            className={`block pr-2 text-[13px] leading-[18px] max-[640px]:inline max-[640px]:pr-0 ${
              step.state === "todo" ? "font-medium text-muted" : step.state === "cancel" ? "font-semibold text-danger" : "font-semibold"
            }`}
          >
            {step.label}
            {step.state === "done" && <span className="sr-only"> (đã qua)</span>}
          </span>
          {step.time && (
            <span className="block pr-2 text-xs leading-4 text-muted tabular-nums max-[640px]:ml-2 max-[640px]:inline max-[640px]:pr-0">
              {step.time}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
