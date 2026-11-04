"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { HotelPricing } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import { useUpdateHotelPricing } from "@/lib/queries/hotel-pricing";
import { SIZE_GROUPS_BY_SPECIES } from "@/lib/size-groups";
import {
  LATE_BLOCK_MINUTES,
  LATE_GRACE_MINUTES,
  findHotelPricingIssue,
  toHotelPricing,
  toHotelPricingFormValues,
  validateLateFee,
  type HotelPricingFormValues,
} from "../forms";

/** Id của form; nút “Lưu bảng giá” trên đầu trang (CagesScreen) gửi form này bằng thuộc tính `form`. */
export const HOTEL_PRICING_FORM_ID = "hotel-pricing-form";

// `.price-grid` của ui-demo: ô đệm 8px 10px; cột Loài đệm trái 20px.
const headCellClass = "border-b border-line bg-mist px-2.5 py-2 text-left text-xs font-semibold text-muted";
const cellClass = "border-b border-line-soft px-2.5 py-2";

/** Vùng 5 (bảng giá mỗi đêm) và vùng 6 (phí trả muộn) của MW-07, tab Giá lưu trú – UI-Screens.md (FR-HTL-03). Chỉ render khi đã có dữ liệu. */
export function HotelPricingForm({ pricing }: { pricing: HotelPricing }) {
  const { showSuccess } = useToast();
  const updatePricing = useUpdateHotelPricing();
  const [issue, setIssue] = useState<string | null>(null);

  // Form đi theo dữ liệu backend: mỗi lần `pricing` đổi (refetch khi quay lại tab, mở lại trang từ cache cũ) giá trị mới được nạp
  // vào các ô CHƯA bị sửa; ô Quản lý đang sửa dở được giữ nguyên. `useMemo` giữ `values` ổn định giữa các lần render.
  const serverValues = useMemo(() => toHotelPricingFormValues(pricing), [pricing]);
  const {
    register,
    handleSubmit,
    getValues,
    reset: resetForm,
    formState,
  } = useForm<HotelPricingFormValues>({
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const { errors } = formState;
  // `keepDirtyValues` chỉ biết ô nào đã sửa nếu `dirtyFields` được đọc (theo dõi) trong lúc render. Đừng xóa dòng này.
  void formState.dirtyFields;

  // Kiểm tra bảng giá: hiện lỗi đầu tiên hoặc xóa lỗi cũ. Trả về true nếu hợp lệ.
  function checkPricing(values: HotelPricingFormValues["pricing"]) {
    const pricingIssue = findHotelPricingIssue(values, pricing);
    setIssue(pricingIssue);
    return pricingIssue === null;
  }

  // Mỗi lần bấm Lưu đều bỏ lỗi server của lần trước và kiểm tra lại bảng giá, kể cả khi ô phí trả muộn sai
  // (lúc đó RHF không gọi nhánh hợp lệ nên phải xử lý ở nhánh thứ hai của handleSubmit).
  const handleSave = handleSubmit(
    (values) => {
      updatePricing.reset();
      if (!checkPricing(values.pricing)) return;

      const body = toHotelPricing(values);
      updatePricing.mutate(body, {
        onSuccess: () => {
          // Đưa form về trạng thái “sạch”, khớp dữ liệu vừa lưu, để lần refetch sau lại cập nhật được mọi ô.
          resetForm(toHotelPricingFormValues(body));
          showSuccess("Đã lưu bảng giá. Áp dụng cho lịch lưu trú tạo từ bây giờ.");
        },
      });
    },
    () => {
      updatePricing.reset();
      checkPricing(getValues("pricing"));
    },
  );

  return (
    <form
      id={HOTEL_PRICING_FORM_ID}
      noValidate
      onSubmit={handleSave}
      className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 max-[1180px]:grid-cols-1"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <ErrorAlert error={updatePricing.error} />
        {issue && <Alert>{issue}</Alert>}

        <Card>
          <CardHeader title="Giá mỗi đêm theo loài và nhóm kích cỡ" />
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={`${headCellClass} pl-5`}>Loài</th>
                  <th className={headCellClass}>Nhóm</th>
                  <th className={headCellClass}>Chỗ ở / đêm</th>
                  <th className={headCellClass}>Thức ăn / đêm</th>
                </tr>
              </thead>
              {/* Mỗi loài một tbody để scope="rowgroup" của ô tên loài chỉ áp cho các nhóm của loài đó. */}
              {SPECIES_ORDER.map((species) => (
                <tbody key={species}>
                  {SIZE_GROUPS_BY_SPECIES[species].map((sizeGroup, index) => {
                    const target = `nhóm ${SIZE_GROUP_LABELS[sizeGroup]} của ${SPECIES_LABELS[species]}`;
                    return (
                      <tr key={sizeGroup}>
                        {index === 0 && (
                          <th
                            scope="rowgroup"
                            rowSpan={SIZE_GROUPS_BY_SPECIES[species].length}
                            className="border-b border-line-soft py-2 pl-5 pr-2.5 text-left align-middle font-semibold whitespace-nowrap"
                          >
                            {SPECIES_LABELS[species]}
                          </th>
                        )}
                        <td className={`${cellClass} whitespace-nowrap`}>{SIZE_GROUP_LABELS[sizeGroup]}</td>
                        <td className={cellClass}>
                          <Input
                            {...register(`pricing.${species}.${sizeGroup}.pricePerNight`)}
                            compact
                            suffix="đ"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`Giá chỗ ở mỗi đêm ${target}`}
                            className="text-right tabular-nums"
                          />
                        </td>
                        <td className={cellClass}>
                          <Input
                            {...register(`pricing.${species}.${sizeGroup}.foodPerNight`)}
                            compact
                            suffix="đ"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`Giá thức ăn mỗi đêm ${target}`}
                            className="text-right tabular-nums"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody>
            <h2 className="mb-4">Phí trả muộn</h2>
            <Field id="late-fee-per-block" label="Mức phí mỗi lần" required error={errors.lateFeePerBlock?.message}>
              {(control) => (
                <Input
                  {...control}
                  {...register("lateFeePerBlock", { validate: validateLateFee })}
                  suffix="đ"
                  inputMode="numeric"
                  autoComplete="off"
                  className="tabular-nums"
                />
              )}
            </Field>
            <p className="mt-3 text-xs text-muted">
              Miễn phí {LATE_GRACE_MINUTES} phút đầu sau giờ trả dự kiến. Từ phút thứ {LATE_GRACE_MINUTES + 1}, mỗi {LATE_BLOCK_MINUTES}{" "}
              phút tính 1 lần. Hai mốc thời gian này đổi tại{" "}
              <Link href={`${ROUTES.config}?group=hotel`} className="font-semibold text-lagoon-700 underline">
                Cấu hình
              </Link>
              .
            </p>
          </CardBody>
        </Card>
        <Alert tone="info">
          Giá mới áp dụng cho lịch lưu trú tạo sau khi lưu. Tiền lưu trú = số đêm × (chỗ ở + thức ăn). Nhóm chưa có giá có thể để
          trống cả hai ô (sẽ không được lưu); nhóm đã có giá không thể để trống.
        </Alert>
      </div>
    </form>
  );
}
