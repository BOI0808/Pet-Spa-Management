"use client";

import { useId, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import type { ApiError } from "@/lib/api/errors";
import type { Cage } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { useCreateCage, useUpdateCage } from "@/lib/queries/cages";
import { SIZE_GROUPS_BY_SPECIES } from "@/lib/size-groups";
import {
  isSizeGroupAllowed,
  toCageFormValues,
  toCageRequest,
  validateCageCode,
  validateCageSizeGroup,
  validateCageSpecies,
  type CageFormValues,
} from "../forms";

const FORM_ID = "cage-form";
const ALL_SIZE_GROUPS = SIZE_GROUPS_BY_SPECIES.Dog;
const DUPLICATE_CAGE_CODE = "DUPLICATE_CAGE_CODE";

type CageFormDialogProps = {
  /** Chuồng đang sửa; `null` khi thêm mới. */
  cage: Cage | null;
  onClose: () => void;
  /** Gọi khi backend đã lưu xong, kèm chuồng sau khi lưu để cập nhật danh sách trong phiên. */
  onSaved: (cage: Cage) => void;
};

/** MW-07·D1 Thêm / sửa chuồng (hộp thoại giữa màn) – UI-Screens.md. Chỉ render khi đang mở nên form luôn bắt đầu từ giá trị mới. */
export function CageFormDialog({ cage, onClose, onSaved }: CageFormDialogProps) {
  const titleId = useId();
  const { showSuccess } = useToast();
  const createCage = useCreateCage();
  const updateCage = useUpdateCage();
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CageFormValues>({
    defaultValues: toCageFormValues(cage),
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const species = useWatch({ control, name: "species" });
  const sizeGroups = species === "" ? ALL_SIZE_GROUPS : SIZE_GROUPS_BY_SPECIES[species];

  const isPending = createCage.isPending || updateCage.isPending;
  const submitError = createCage.error ?? updateCage.error;

  // Đổi loài làm nhóm đang chọn không còn hợp lệ (chuột lang không có nhóm Vừa) thì bỏ chọn nhóm.
  function handleSpeciesChange(event: ChangeEvent<HTMLSelectElement>) {
    if (!isSizeGroupAllowed(event.target.value, getValues("sizeGroup"))) setValue("sizeGroup", "");
  }

  // Trùng mã (409) báo ngay dưới ô Mã; mọi lỗi khác hiện ở alert đầu form.
  function handleError(error: ApiError) {
    if (error.code === DUPLICATE_CAGE_CODE) setError("code", { message: "Mã chuồng đã tồn tại." });
  }

  const handleSave = handleSubmit((values) => {
    const body = toCageRequest(values);
    if (!body) return;

    if (cage) {
      updateCage.mutate(
        { cageId: cage.cageId, body },
        {
          onSuccess: () => {
            showSuccess(`Đã lưu chuồng ${body.code}`);
            onSaved({ ...cage, ...body });
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createCage.mutate(body, {
        onSuccess: ({ cageId }) => {
          showSuccess(`Đã thêm chuồng ${body.code}`);
          onSaved({ cageId, ...body, isActive: true });
          onClose();
        },
        onError: handleError,
      });
    }
  });

  return (
    <Overlay labelledBy={titleId} onClose={onClose} locked={isPending}>
      {/* Khung `.modal` của ui-demo, cùng kích thước và hoạt ảnh với ConfirmDialog. */}
      <div className="max-h-[calc(100vh-40px)] w-full max-w-[480px] animate-pop-in overflow-auto rounded-2xl bg-white shadow-pop">
        <div className="flex items-start gap-3.5 px-5 pt-5">
          {/* Ô biểu tượng tông teal: `.mh-icon.teal` của ui-demo. */}
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lagoon-50 text-lagoon">
            <Icon name="grid" className="size-[22px]" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-lg leading-[26px]">
              {cage ? `Sửa chuồng ${cage.code}` : "Thêm chuồng"}
            </h2>
            <p className="mt-0.5 text-muted">
              {cage ? "Cập nhật mã, loài và nhóm kích cỡ của chuồng." : "Chuồng mới tính ngay vào sức chứa lưu trú."}
            </p>
          </div>
        </div>

        <form id={FORM_ID} noValidate onSubmit={handleSave} className="flex flex-col gap-4 px-5 py-4">
          {/* Trùng mã đã báo dưới ô Mã nên không lặp lại ở alert. */}
          <ErrorAlert error={submitError?.code === DUPLICATE_CAGE_CODE ? null : submitError} />

          <Field id="cage-code" label="Mã chuồng" required error={errors.code?.message}>
            {(field) => <Input {...field} {...register("code", { validate: validateCageCode })} autoComplete="off" />}
          </Field>

          <div className="grid grid-cols-2 gap-x-4 max-[480px]:grid-cols-1 max-[480px]:gap-y-4">
            <Field id="cage-species" label="Loài" required error={errors.species?.message}>
              {(field) => (
                <Select
                  {...field}
                  {...register("species", { validate: validateCageSpecies, onChange: handleSpeciesChange })}
                >
                  <option value="">Chọn loài</option>
                  {SPECIES_ORDER.map((item) => (
                    <option key={item} value={item}>
                      {SPECIES_LABELS[item]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="cage-size-group" label="Nhóm kích cỡ" required error={errors.sizeGroup?.message}>
              {(field) => (
                <Select {...field} {...register("sizeGroup", { validate: validateCageSizeGroup })}>
                  <option value="">Chọn nhóm</option>
                  {sizeGroups.map((item) => (
                    <option key={item} value={item}>
                      {SIZE_GROUP_LABELS[item]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </form>

        <div className="flex justify-end gap-2.5 px-5 pb-5 pt-3.5">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={isPending}>
            Lưu chuồng
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
