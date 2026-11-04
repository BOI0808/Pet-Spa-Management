import { useState } from "react";
import { SpeciesIllustration } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { Service, SizeGroup, Species } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SIZE_GROUP_ORDER, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { useServices } from "@/lib/queries/services";

const SPECIES_SEGMENTS = SPECIES_ORDER.map((species) => ({
  value: species,
  label: SPECIES_LABELS[species],
  icon: <SpeciesIllustration species={species} />,
}));

// `.catalog-row` của ui-demo. Dưới 640px tên dịch vụ chiếm cả dòng, 3 nhóm xếp bên dưới và mỗi ô tự có nhãn nhóm
// vì hàng tiêu đề bị ẩn (ui-demo xếp 2 cột nên giá không còn biết thuộc nhóm nào).
const ROW_CLASS =
  "grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] border-b border-line-soft last:border-b-0 max-[640px]:grid-cols-3";
const CELL_CLASS = "px-4 py-3.5 max-[640px]:px-3";
const META_CLASS = "text-xs leading-4 text-muted";

function serviceNote({ description, latestStartTime }: Service) {
  const intro = description ? `${description.trim().replace(/\.+$/, "")}. ` : "";
  return `${intro}Nhận đến ${latestStartTime}.`;
}

function PriceCell({ service, species, sizeGroup }: { service: Service; species: Species; sizeGroup: SizeGroup }) {
  const row = service.pricing.find((item) => item.species === species && item.sizeGroup === sizeGroup);
  return (
    <div role="cell" className={CELL_CLASS}>
      <div className={`hidden max-[640px]:block ${META_CLASS}`}>Nhóm {SIZE_GROUP_LABELS[sizeGroup]}</div>
      {row ? (
        <>
          <div className="font-bold tabular-nums">{formatMoney(row.price)}</div>
          <div className={META_CLASS}>{row.durationMinutes} phút</div>
        </>
      ) : (
        <div className="text-[#A2B3B7]">Không áp dụng</div>
      )}
    </div>
  );
}

function CatalogTable({ services, species }: { services: Service[]; species: Species }) {
  return (
    <div role="table" aria-label={`Giá và thời lượng dịch vụ cho ${SPECIES_LABELS[species]}`}>
      <div role="row" className={`${ROW_CLASS} max-[640px]:hidden`}>
        {["Dịch vụ", ...SIZE_GROUP_ORDER.map((group) => `Nhóm ${SIZE_GROUP_LABELS[group]}`)].map((title) => (
          <div key={title} role="columnheader" className="bg-mist px-4 py-2.5 text-xs font-semibold text-muted">
            {title}
          </div>
        ))}
      </div>
      {services.map((service) => (
        <div key={service.serviceId} role="row" className={ROW_CLASS}>
          <div role="rowheader" className={`${CELL_CLASS} max-[640px]:col-span-full max-[640px]:pb-0`}>
            <div className="font-semibold">{service.name}</div>
            <div className={META_CLASS}>{serviceNote(service)}</div>
          </div>
          {SIZE_GROUP_ORDER.map((sizeGroup) => (
            <PriceCell key={sizeGroup} service={service} species={species} sizeGroup={sizeGroup} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải danh mục dịch vụ" className="flex flex-col gap-4 p-5">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  );
}

/** Vùng 3, 4 – FR-SVC-04. Tải một lần rồi lọc theo loài ở web để đổi loài không phải gọi lại API. */
export function ServiceCatalog() {
  const services = useServices();
  const [species, setSpecies] = useState<Species>("Dog");

  let content;
  if (services.isPending) {
    content = <CatalogSkeleton />;
  } else if (services.isError) {
    content = (
      <div className="flex flex-col items-start gap-3 p-5">
        <ErrorAlert error={services.error} className="w-full" />
        <Button onClick={() => void services.refetch()}>Thử lại</Button>
      </div>
    );
  } else {
    const servicesOfSpecies = services.data.filter((service) => service.pricing.some((row) => row.species === species));
    content =
      servicesOfSpecies.length > 0 ? (
        <CatalogTable services={servicesOfSpecies} species={species} />
      ) : (
        <p className="px-5 py-10 text-center text-muted">Chưa có dịch vụ cho loài này.</p>
      );
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2.5 max-[980px]:flex-wrap">
        <h2 className="flex-1 whitespace-nowrap">Danh mục dịch vụ spa</h2>
        <SegmentedControl
          label="Chọn loài"
          options={SPECIES_SEGMENTS}
          value={species}
          onChange={setSpecies}
          className="max-[980px]:w-full"
        />
      </div>
      <Card className="overflow-hidden">{content}</Card>
      <p className="mt-2 text-xs leading-4 text-muted">
        Giá tính theo nhóm kích cỡ của bé. Hệ thống xác định nhóm từ cân nặng (với chó: thêm chiều cao vai, lấy nhóm cao
        hơn) và đối chiếu lại khi cân tại cửa hàng.
      </p>
    </section>
  );
}
