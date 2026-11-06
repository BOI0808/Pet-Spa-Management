import type { ReactNode } from "react";
import type { Species } from "@/lib/api/types";
import { PetAvatar } from "./pet-avatar";

type PetLineProps = {
  species: Species;
  name: string;
  meta: string;
  size?: "sm" | "md";
  /** Phần bên phải, ví dụ thẻ nhóm kích cỡ. */
  children?: ReactNode;
};

/** Hình + tên + dòng phụ (`.pet-line` của ui-demo). */
export function PetLine({ species, name, meta, size = "md", children }: PetLineProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PetAvatar species={species} size={size} />
      <div className="min-w-0 flex-1">
        <div className="break-words font-semibold">{name}</div>
        <div className="break-words text-xs leading-4 text-muted">{meta}</div>
      </div>
      {children}
    </div>
  );
}
