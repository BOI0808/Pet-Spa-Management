// Khung xương của MW-01 (FA 4.1): giữ bố cục hai cột và khối form để trang không nhảy khi màn thật hiện ra.
export function LoginSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải"
      className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-[980px]:grid-cols-1"
    >
      <div className="bg-lagoon-800 max-[980px]:hidden" />
      <div className="flex items-center justify-center bg-white px-8 py-12 max-[980px]:px-4">
        <div className="w-full max-w-[400px] animate-pulse space-y-4">
          <div className="h-[34px] w-56 rounded-lg bg-line-soft" />
          <div className="h-5 w-72 max-w-full rounded-lg bg-line-soft" />
          <div className="mt-6 h-[42px] rounded-[10px] bg-line-soft" />
          <div className="h-[42px] rounded-[10px] bg-line-soft" />
          <div className="h-12 rounded-[10px] bg-line-soft" />
        </div>
      </div>
    </div>
  );
}
