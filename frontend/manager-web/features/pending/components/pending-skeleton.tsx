import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Khung xương của MW-04: ba phiếu bên trái, thẻ chi tiết bên phải (UI-Screens 2.2). */
export function PendingSkeleton() {
  return (
    <div className="grid grid-cols-[420px_minmax(0,1fr)] items-start gap-6 max-[1180px]:grid-cols-1">
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[66px] rounded-2xl" />
        ))}
      </div>
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-[72px] rounded-[22px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
        <Skeleton className="mt-6 h-[62px] rounded-xl" />
      </Card>
    </div>
  );
}
