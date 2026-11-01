"use client";

import type { UseFormRegister } from "react-hook-form";
import { Input, Select } from "@/components/ui/field";
import type { Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { SIZE_GROUPS_BY_SPECIES, type ServiceFormValues } from "../forms";

const headCellClass = "border-b border-line bg-mist px-2.5 py-2 text-left text-xs font-semibold text-muted";
const cellClass = "border-b border-line-soft px-2.5 py-2";

/** Bảng nhập Giá · Thời lượng · Số nhân viên theo từng nhóm kích cỡ của một loài (`.price-grid` của ui-demo). */
export function PricingGrid({ species, register }: { species: Species; register: UseFormRegister<ServiceFormValues> }) {
  const speciesLabel = SPECIES_LABELS[species];

  return (
    <div>
      <h3 className="mb-2">{speciesLabel}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={headCellClass}>Nhóm</th>
              <th className={headCellClass}>Giá</th>
              <th className={headCellClass}>Thời lượng</th>
              <th className={headCellClass}>Số nhân viên</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_GROUPS_BY_SPECIES[species].map((sizeGroup) => {
              const groupLabel = SIZE_GROUP_LABELS[sizeGroup];
              const target = `nhóm ${groupLabel} của ${speciesLabel}`;
              return (
                <tr key={sizeGroup}>
                  <td className={`${cellClass} whitespace-nowrap font-semibold`}>{groupLabel}</td>
                  <td className={cellClass}>
                    <Input
                      {...register(`pricing.${species}.${sizeGroup}.price`)}
                      compact
                      suffix="đ"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Giá ${target}`}
                      className="text-right tabular-nums"
                    />
                  </td>
                  <td className={cellClass}>
                    <Input
                      {...register(`pricing.${species}.${sizeGroup}.durationMinutes`)}
                      compact
                      suffix="phút"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Thời lượng ${target}`}
                      className="text-right tabular-nums"
                    />
                  </td>
                  <td className={cellClass}>
                    <Select
                      {...register(`pricing.${species}.${sizeGroup}.staffRequired`)}
                      compact
                      aria-label={`Số nhân viên ${target}`}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
