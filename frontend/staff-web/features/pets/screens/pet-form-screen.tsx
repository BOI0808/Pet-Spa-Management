"use client";

// SW-05 Hồ sơ thú cưng (lễ tân) – UI-Screens.md mục 4 (FR-PET-01, FR-PET-02).
// Phần form chép từ CW-05 của customer-web; khác ở: gửi kèm `customerId`, dải “khách đang phục vụ”, cảnh báo bé khó tính,
// không có nút gỡ hồ sơ (chỉ khách hàng mới gỡ được – Authorization 4).
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldSet, Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { isForbiddenError } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { useCreatePet, usePet, useUpdatePet } from "@/lib/queries/pets";
import { ROUTES, customerSearchRoute } from "@/lib/routes";
import { useServingCustomer, type ServingCustomer } from "@/lib/serving-customer";
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

const PAGE_DESCRIPTION = "Nhập theo thông tin khách khai tại quầy.";

/** Bố cục 2 cột (`.split` của ui-demo): form bên trái, nhóm kích cỡ dự kiến dính bên phải. */
const splitClass = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";

/** Quay về SW-04 với khách đang phục vụ: tìm lại theo số để lễ tân thấy ngay khách và thú cưng vừa lưu. */
function backToCustomer(customer: ServingCustomer) {
  return customerSearchRoute(customer.phone);
}

function crumbs(customer: ServingCustomer, current: string) {
  return [
    { label: "Khách hàng", href: ROUTES.customers },
    { label: customer.fullName, href: backToCustomer(customer) },
    { label: current },
  ];
}

/** Vùng 1 – Khách đang phục vụ (dải nền Mist). */
function ServingCustomerStrip({ customer }: { customer: ServingCustomer }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl bg-mist px-4 py-3">
      <Icon name="user" className="size-[18px] shrink-0 text-muted max-[640px]:hidden" />
      <span className="min-w-0 break-words">
        <b>{customer.fullName}</b>, <span className="tabular-nums">{formatPhone(customer.phone)}</span>
      </span>
      {/* API chưa cho biết khách có tài khoản hay không (G-05): chỉ biết chắc khi vừa ghi nhận khách vãng lai. */}
      {customer.isWalkIn && <Tag tone="walkin">Khách vãng lai</Tag>}
    </div>
  );
}

/** Cảnh báo nội tuyến kiểu `.alert-warn` của ui-demo (Design-System 4.2); mã màu lấy nguyên ui-demo, chưa có token. */
function DifficultTemperamentAlert() {
  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#F1D9A2] bg-[#FFF6E3] px-3.5 py-2.5 text-[13px] leading-5"
    >
      <Icon name="alert" className="mt-px size-[18px] shrink-0 text-[#B87400]" />
      <span>Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn. Hãy báo khách điều này khi chọn giờ.</span>
    </div>
  );
}

/** Vùng 2 → 7. `pet` có giá trị khi sửa hồ sơ. */
function PetForm({ customer, pet }: { customer: ServingCustomer; pet?: Pet }) {
  const router = useRouter();
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
  const [species, weightKg, heightCm, temperament] = useWatch({
    control,
    name: ["species", "weightKg", "heightCm", "temperament"],
  });
  const isDog = species === "Dog";
  // Chưa chọn loài thì vẫn cho nhập chiều cao; chỉ khóa ô khi đã chọn loài không phải chó.
  const heightDisabled = species !== "" && !isDog;

  const onSubmit = handleSubmit((values, event) => {
    const form = event?.target instanceof HTMLFormElement ? event.target : null;
    const options = {
      onSuccess: () => {
        showSuccess("Đã lưu hồ sơ thú cưng");
        // Thẻ 123 chưa có SW-06 (thẻ 124) nên quay về SW-04; thẻ 124 đổi thành “Lưu và đặt lịch” → SW-06.
        router.push(backToCustomer(customer));
      },
      // Lỗi hiện ở đầu form; form dài nên cuộn lên để lễ tân thấy (nhất là trên điện thoại).
      onError: () => form?.scrollIntoView({ behavior: "smooth", block: "start" }),
    };
    // Lễ tân tạo hồ sơ phải gửi `customerId` (openapi PetRequest); khi sửa, backend bỏ qua trường này.
    if (pet) updatePet.mutate({ petId: pet.petId, body: toPetRequest(values) }, options);
    else createPet.mutate({ ...toPetRequest(values), customerId: customer.customerId }, options);
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
              <Field
                id="pet-weight"
                label="Cân nặng (kg)"
                required
                // Sửa hồ sơ: lễ tân nên biết cân nặng thực tế lúc tiếp nhận sẽ ghi đè số này (UI-Screens SW-05, thẻ 126).
                hint={pet ? "Cân nặng thực tế khi tiếp nhận sẽ cập nhật vào đây." : undefined}
                error={errors.weightKg?.message}
              >
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

            {/* Vùng 4 – Tính cách; chọn “Khó tính, dữ” thì cảnh báo để lễ tân báo khách (UI-Screens SW-05). */}
            <FieldSet id="pet-temperament" legend="Tính cách" required>
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
              {temperament === "Difficult" && <DifficultTemperamentAlert />}
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

          {/* Vùng 6 – Nút; web nhân viên vùng chạm tối thiểu 44px (SA 6.1). */}
          <CardFooter>
            <ButtonLink href={backToCustomer(customer)} variant="ghost" className="min-h-11">
              Hủy bỏ
            </ButtonLink>
            <Button type="submit" variant="primary" className="ml-auto min-h-11" loading={mutation.isPending}>
              Lưu hồ sơ
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Vùng 7 – Nhóm kích cỡ dự kiến */}
      <aside className="sticky top-[92px] flex flex-col gap-3 max-[1180px]:static">
        <SizePreview species={species} weightKg={weightKg} heightCm={heightCm} />
        <p className="px-1 text-xs text-muted">Chỉ khách hàng mới gỡ được hồ sơ thú cưng.</p>
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

function PetNotFound({ customer }: { customer: ServingCustomer }) {
  return (
    <NotFoundState
      title="Không tìm thấy hồ sơ thú cưng"
      action={<ButtonLink href={backToCustomer(customer)}>Về khách {customer.fullName}</ButtonLink>}
    />
  );
}

/** Sửa hồ sơ: GET /pets/{id}; 403 → ForbiddenState; 404, hồ sơ đã ngừng hoạt động hoặc của khách khác → không tìm thấy. */
function EditPet({ customer, petId }: { customer: ServingCustomer; petId: string }) {
  const pet = usePet(petId);
  // Hồ sơ phải thuộc khách trên đường dẫn: lễ tân xem được mọi hồ sơ, nên đường dẫn ghép sai khách thì coi như không có.
  const loadedPet = pet.data?.isActive && pet.data.customerId === customer.customerId ? pet.data : null;
  const title = loadedPet ? `Sửa hồ sơ ${loadedPet.name}` : "Sửa hồ sơ thú cưng";

  let content;
  if (pet.isPending) {
    content = <PetFormSkeleton />;
  } else if (pet.isError) {
    if (isForbiddenError(pet.error)) content = <ForbiddenState />;
    // 400: `petId` trên đường dẫn sai định dạng, thử lại vẫn lỗi nên coi như không tìm thấy.
    else if (pet.error.status === 404 || pet.error.status === 400) content = <PetNotFound customer={customer} />;
    else
      content = (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={pet.error} className="w-full" />
          <Button onClick={() => void pet.refetch()}>Thử lại</Button>
        </div>
      );
  } else if (!loadedPet) {
    content = <PetNotFound customer={customer} />;
  } else {
    content = <PetForm key={loadedPet.petId} customer={customer} pet={loadedPet} />;
  }

  return (
    <>
      <PageHeader breadcrumb={crumbs(customer, loadedPet?.name ?? "Hồ sơ thú cưng")} title={title} description={PAGE_DESCRIPTION} />
      <ServingCustomerStrip customer={customer} />
      {content}
    </>
  );
}

/**
 * `/khach-hang/[customerId]/thu-cung/them` (tạo) hoặc `/khach-hang/[customerId]/thu-cung/[petId]` (sửa).
 * Cần “khách đang phục vụ” chọn ở SW-04 (API chưa có GET /customers/{id} – G-14); không có hoặc khác khách trên
 * đường dẫn thì hướng lễ tân về SW-04 chọn lại.
 */
export function PetFormScreen() {
  const { customerId, petId } = useParams<{ customerId: string; petId?: string }>();
  const servingCustomer = useServingCustomer();

  if (servingCustomer === undefined) return <PetFormSkeleton />;
  if (!servingCustomer || servingCustomer.customerId !== customerId) {
    return (
      <EmptyState
        icon="users"
        title="Chưa chọn khách hàng"
        description="Tìm khách theo số điện thoại rồi chọn thú cưng hoặc thêm thú cưng cho khách đó."
        action={<ButtonLink href={ROUTES.customers}>Tìm khách</ButtonLink>}
      />
    );
  }

  if (petId) return <EditPet customer={servingCustomer} petId={petId} />;
  return (
    <>
      <PageHeader breadcrumb={crumbs(servingCustomer, "Thêm thú cưng")} title="Tạo hồ sơ thú cưng" description={PAGE_DESCRIPTION} />
      <ServingCustomerStrip customer={servingCustomer} />
      <PetForm customer={servingCustomer} />
    </>
  );
}
