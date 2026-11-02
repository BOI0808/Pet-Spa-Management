import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CagesScreen } from "@/features/cages/screens/cages-screen";

// MW-07 Chuồng và giá lưu trú. `CagesScreen` đọc `useSearchParams` (?tab) nên phải nằm trong Suspense (đang bật cacheComponents).
export default function CagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <CagesScreen />
    </Suspense>
  );
}
