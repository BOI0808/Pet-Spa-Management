"use client";

import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { Service } from "@/lib/api/types";
import { SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { useCreateService, useUpdateService } from "@/lib/queries/services";
import {
  SLOT_TIME_OPTIONS,
  findPricingIssue,
  toServiceFormValues,
  toServiceRequest,
  validateLatestStartTime,
  validateSelectedSpecies,
  validateServiceName,
  type ServiceFormValues,
} from "../forms";
import { PricingGrid } from "./pricing-grid";

const FORM_ID = "service-form";

type ServiceFormDrawerProps = {
  /** Dịch vụ đang sửa; `null` khi thêm mới. */
  service: Service | null;
  onClose: () => void;
};

/** MW-06·D1 Thêm / sửa dịch vụ (ngăn kéo phải) – UI-Screens.md. Chỉ render khi đang mở nên form luôn bắt đầu từ giá trị mới. */
export function ServiceFormDrawer({ service, onClose }: ServiceFormDrawerProps) {
  const { showSuccess } = useToast();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const {
    register,
    handleSubmit,
    control: formControl,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    defaultValues: toServiceFormValues(service),
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const [selectedSpecies, pricing] = useWatch({ control: formControl, name: ["species", "pricing"] });
  // Thiếu ô nào của loài đã chọn thì hiện cảnh báo và khóa nút lưu (UI-Screens MW-06·D1).
  const pricingIssue = findPricingIssue({ species: selectedSpecies, pricing });

  const isPending = createService.isPending || updateService.isPending;
  const submitError = createService.error ?? updateService.error;

  const handleSave = handleSubmit((values) => {
    if (findPricingIssue(values)) return;
    const body = toServiceRequest(values);
    const onSuccess = () => {
      showSuccess(`Đã lưu dịch vụ ${body.name}`);
      onClose();
    };
    if (service) updateService.mutate({ serviceId: service.serviceId, body }, { onSuccess });
    else createService.mutate(body, { onSuccess });
  });

  return (
    <Drawer
      title={service ? `Sửa dịch vụ: ${service.name}` : "Thêm dịch vụ"}
      locked={isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={isPending} disabled={pricingIssue !== null}>
            Lưu dịch vụ
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSave} className="flex flex-col gap-6">
        <ErrorAlert error={submitError} />
        {pricingIssue && <Alert>{pricingIssue}</Alert>}

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
          <Field
            id="service-name"
            label="Tên dịch vụ"
            required
            error={errors.name?.message}
            className="col-span-2 max-[640px]:col-span-1"
          >
            {(control) => (
              <Input {...control} {...register("name", { validate: validateServiceName })} autoComplete="off" />
            )}
          </Field>
          <Field id="service-description" label="Mô tả" className="col-span-2 max-[640px]:col-span-1">
            {(control) => <Textarea {...control} {...register("description")} />}
          </Field>
          <Field
            id="service-latest-start"
            label="Mốc bắt đầu muộn nhất"
            required
            hint="Phải là một mốc giờ trong cấu hình."
            error={errors.latestStartTime?.message}
          >
            {(control) => (
              <Select {...control} {...register("latestStartTime", { validate: validateLatestStartTime })}>
                <option value="">Chọn mốc giờ</option>
                {SLOT_TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-[13px] font-semibold leading-[18px]">
              Loài áp dụng<span className="ml-0.5 text-danger">*</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {SPECIES_ORDER.map((species) => (
                // `.chip` của ui-demo: nút tròn, đang chọn thì nền Ink; input thật ẩn bên trong để bàn phím chọn được (Design-System 4.1).
                <label
                  key={species}
                  className="inline-flex h-[34px] cursor-pointer items-center whitespace-nowrap rounded-full border border-line bg-white px-3.5 text-[13px] font-medium hover:border-[#A9C6CB] has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-[3px] has-focus-visible:outline-lagoon/40"
                >
                  <input
                    type="checkbox"
                    value={species}
                    className="sr-only"
                    {...register("species", { validate: validateSelectedSpecies })}
                  />
                  {SPECIES_LABELS[species]}
                </label>
              ))}
            </div>
            <FieldError message={errors.species?.message} />
          </fieldset>
        </div>

        {SPECIES_ORDER.filter((species) => selectedSpecies.includes(species)).map((species) => (
          <PricingGrid key={species} species={species} register={register} />
        ))}

        <p className="text-xs text-muted">
          Giá, thời lượng mới áp dụng cho các lượt đặt lịch tiếp theo. Số nhân viên là 1 hoặc 2; bé khó tính luôn cần tối thiểu
          2.
        </p>
      </form>
    </Drawer>
  );
}
