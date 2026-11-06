"use client";

// CW-05 Tạo / sửa hồ sơ thú cưng – UI-Screens.md
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { useToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Field, FieldSet, Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Pet, PetSizeResult } from "@/lib/api/types";
import { SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { useCreatePet, usePet, useUpdatePet } from "@/lib/queries/pets";
import { PET_RETURN_TO_BOOKING, ROUTES } from "@/lib/routes";
import { validateBreed, validateHeightCm, validatePetName, validateWeightKg } from "@/lib/validation";
import { SizePreview } from "../components/size-preview";
import {
  EMPTY_PET_FORM,
  SPECIES_OPTIONS,
  TEMPERAMENT_OPTIONS,
  toPetFormValues,
  toPetRequest,
  validateSpecies,
  type PetFormValues,
} from "../forms";

const PAGE_DESCRIPTION = "Thông tin do bạn khai, cửa hàng đối chiếu lại cân nặng khi tiếp nhận.";

function crumbs(current: string) {
  return [{ label: "Thú cưng của tôi", href: ROUTES.pets }, { label: current }];
}

function PetNotFound() {
  return (
    <NotFoundState
      title="Không tìm thấy hồ sơ thú cưng"
      action={<ButtonLink href={ROUTES.pets}>Về Thú cưng của tôi</ButtonLink>}
    />
  );
}

/** Bố cục 2 cột (`.split` của ui-demo): form bên trái, nhóm kích cỡ dự kiến dính bên phải. */
const splitClass = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";

/** Vùng 2 → 7. `pet` có giá trị khi sửa hồ sơ. */
function PetForm({ pet }: { pet?: Pet }) {
  const router = useRouter();
  // Đến từ CW-06: lưu xong quay lại đặt lịch với bé vừa tạo được chọn (UI-Screens CW-05).
  const returnToBooking = useSearchParams().get("returnTo") === PET_RETURN_TO_BOOKING;
  const { showSuccess } = useToast();
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const mutation = pet ? updatePet : createPet;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<PetFormValues>({
    defaultValues: pet ? toPetFormValues(pet) : EMPTY_PET_FORM,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const [species, weightKg, heightCm] = useWatch({ control, name: ["species", "weightKg", "heightCm"] });
  const isDog = species === "Dog";
  // Chưa chọn loài thì vẫn cho nhập chiều cao; chỉ khóa ô khi đã chọn loài không phải chó.
  const heightDisabled = species !== "" && !isDog;

  const onSubmit = handleSubmit((values, event) => {
    const form = event?.target instanceof HTMLFormElement ? event.target : null;
    const body = toPetRequest(values);
    const options = {
      onSuccess: ({ petId }: PetSizeResult) => {
        showSuccess("Đã lưu hồ sơ thú cưng");
        router.push(returnToBooking && petId ? ROUTES.spaBookingForPet(petId) : ROUTES.pets);
      },
      // Lỗi hiện ở đầu form; form dài nên cuộn lên để khách thấy (nhất là trên điện thoại).
      onError: () => form?.scrollIntoView({ behavior: "smooth", block: "start" }),
    };
    if (pet) updatePet.mutate({ petId: pet.petId, body }, options);
    else createPet.mutate(body, options);
  });

  return (
    <div className={splitClass}>
      <Card>
        <form noValidate onSubmit={onSubmit} className="scroll-mt-[92px]">
          <div className="flex flex-col gap-6 p-5">
            {/* 400 (vd. đổi loài khi bé đã có lịch hẹn), 403, 404: giữ nguyên dữ liệu đã nhập. */}
            {mutation.error && <ErrorAlert error={mutation.error} />}

            {/* Vùng 2 – Loài */}
            <FieldSet
              id="pet-species"
              legend="Loài"
              required
              hint="Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang."
              error={errors.species?.message}
            >
              <div className="grid grid-cols-4 gap-2.5 max-[980px]:grid-cols-2">
                {SPECIES_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option}
                    value={option}
                    {...register("species", {
                      validate: validateSpecies,
                      onChange: (event) => {
                        // Loài khác chó không có chiều cao: xóa số đã nhập để không gửi nhầm.
                        if (event.target.value !== "Dog") setValue("heightCm", "");
                        clearErrors("heightCm");
                      },
                    })}
                  >
                    <PetAvatar species={option} size="sm" />
                    <span className="min-w-0 break-words">{SPECIES_LABELS[option]}</span>
                  </ChoiceCard>
                ))}
              </div>
            </FieldSet>

            {/* Vùng 3 – Thông tin cơ bản */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
              <Field id="pet-name" label="Tên" required error={errors.name?.message}>
                {(fieldControl) => (
                  <Input {...fieldControl} {...register("name", { validate: validatePetName })} maxLength={100} />
                )}
              </Field>
              <Field id="pet-breed" label="Giống" required error={errors.breed?.message}>
                {(fieldControl) => (
                  <Input {...fieldControl} {...register("breed", { validate: validateBreed })} maxLength={100} />
                )}
              </Field>
              <Field id="pet-weight" label="Cân nặng (kg)" required error={errors.weightKg?.message}>
                {(fieldControl) => (
                  <Input
                    {...fieldControl}
                    {...register("weightKg", { validate: validateWeightKg })}
                    inputMode="decimal"
                    suffix="kg"
                    className="tabular-nums"
                  />
                )}
              </Field>
              <Field
                id="pet-height"
                label="Chiều cao vai (cm)"
                required={isDog}
                note={heightDisabled ? "chỉ cần với chó" : undefined}
                hint={heightDisabled ? undefined : "Bắt buộc với chó, đo từ mặt đất tới vai."}
                error={errors.heightCm?.message}
              >
                {(fieldControl) => (
                  <Input
                    {...fieldControl}
                    {...register("heightCm", {
                      validate: (value, values) => validateHeightCm(value, values.species === "Dog"),
                    })}
                    disabled={heightDisabled}
                    inputMode="decimal"
                    suffix="cm"
                    className="tabular-nums"
                  />
                )}
              </Field>
            </div>

            {/* Vùng 4 – Tính cách */}
            <FieldSet
              id="pet-temperament"
              legend="Tính cách"
              required
              hint="Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn."
            >
              <div className="grid grid-cols-3 gap-2.5 max-[980px]:grid-cols-1">
                {TEMPERAMENT_OPTIONS.map((option) => (
                  <ChoiceCard key={option.value} value={option.value} showDot {...register("temperament")}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{TEMPERAMENT_LABELS[option.value]}</span>
                      <span className="block text-xs text-muted">{option.description}</span>
                    </span>
                  </ChoiceCard>
                ))}
              </div>
            </FieldSet>

            {/* Vùng 5 – Lông, ghi chú */}
            <div className="flex flex-col gap-4">
              <Field id="pet-coat" label="Đặc điểm lông" optional error={errors.coatNote?.message}>
                {(fieldControl) => <Input {...fieldControl} {...register("coatNote")} maxLength={255} />}
              </Field>
              <Field id="pet-notes" label="Ghi chú" note="tiền sử bệnh, lưu ý chăm sóc">
                {(fieldControl) => <Textarea {...fieldControl} {...register("notes")} />}
              </Field>
            </div>
          </div>

          {/* Vùng 6 – Nút */}
          <CardFooter>
            <ButtonLink href={returnToBooking ? ROUTES.spaBooking : ROUTES.pets} variant="ghost">
              Hủy bỏ
            </ButtonLink>
            <Button type="submit" variant="primary" className="ml-auto" loading={mutation.isPending}>
              Lưu hồ sơ
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Vùng 7 – Nhóm kích cỡ dự kiến */}
      <aside className="sticky top-[92px] max-[1180px]:static">
        <SizePreview species={species} weightKg={weightKg} heightCm={heightCm} />
      </aside>
    </div>
  );
}

function PetFormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className={splitClass}>
      <Card className="p-5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="mt-2 h-[58px] w-full rounded-xl" />
        <Skeleton className="mt-6 h-[42px] w-full rounded-[10px]" />
        <Skeleton className="mt-4 h-[42px] w-full rounded-[10px]" />
        <Skeleton className="mt-6 h-[58px] w-full rounded-xl" />
      </Card>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

/** Sửa hồ sơ: tải GET /pets/{id}; 403 → ForbiddenState, 404 hoặc hồ sơ đã ngừng hoạt động (BR-25) → NotFoundState. */
function EditPet({ petId }: { petId: string }) {
  const pet = usePet(petId);
  const loadedPet = pet.data?.isActive ? pet.data : null;
  const title = loadedPet ? `Sửa hồ sơ ${loadedPet.name}` : "Sửa hồ sơ thú cưng";

  let content;
  if (pet.isPending) {
    content = <PetFormSkeleton />;
  } else if (pet.isError) {
    if (isForbiddenError(pet.error)) content = <ForbiddenState />;
    // 400: `petId` trên đường dẫn sai định dạng, thử lại vẫn lỗi nên coi như không tìm thấy.
    else if (pet.error.status === 404 || pet.error.status === 400) content = <PetNotFound />;
    else
      content = (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={pet.error} className="w-full" />
          <Button onClick={() => void pet.refetch()}>Thử lại</Button>
        </div>
      );
  } else if (!loadedPet) {
    content = <PetNotFound />;
  } else {
    content = <PetForm key={loadedPet.petId} pet={loadedPet} />;
  }

  return (
    <>
      <PageHeader breadcrumb={crumbs(title)} title={title} description={PAGE_DESCRIPTION} />
      {content}
    </>
  );
}

/** `/thu-cung/them` (thêm) hoặc `/thu-cung/[petId]/sua` (sửa). */
export function PetFormScreen() {
  const { petId } = useParams<{ petId?: string }>();

  if (petId) return <EditPet petId={petId} />;
  return (
    <>
      <PageHeader breadcrumb={crumbs("Thêm thú cưng")} title="Thêm thú cưng" description={PAGE_DESCRIPTION} />
      <PetForm />
    </>
  );
}
