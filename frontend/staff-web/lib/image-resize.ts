// Thu nhỏ ảnh ở trình duyệt trước khi tải lên (SA 3.2: “nén, thu nhỏ ảnh trước khi tải lên”). Thông số theo
// Frontend-Architecture 9 / UI-Screens SW-11 (Đề xuất): cạnh dài tối đa 1600px, JPEG chất lượng 0,8.

export const MAX_PHOTO_BYTES = 50 * 1024 * 1024; // giới hạn của backend (PhotoUploadRequestValidator)

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.8;

/** Ảnh đã nhỏ sẵn (≤ 1600px và dưới 1 MB) thì gửi nguyên tệp, không nén lại làm giảm chất lượng vô ích. */
const KEEP_ORIGINAL_BYTES = 1024 * 1024;

export type PreparedPhoto = { blob: Blob; fileName: string };

/** `ảnh.png` → `ảnh.jpg` khi đã chuyển sang JPEG. */
function toJpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "anh";
  return `${base}.jpg`;
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

/**
 * Trả về ảnh để gửi đi. `createImageBitmap` với `imageOrientation: "from-image"` xoay ảnh theo EXIF nên ảnh chụp dọc
 * từ điện thoại không bị nằm ngang. Trình duyệt không đọc được định dạng (ví dụ HEIC trên Chrome) hoặc vẽ lỗi thì gửi
 * nguyên tệp: backend vẫn nhận mọi `image/*`, chỉ là tệp lớn hơn.
 */
export async function preparePhotoForUpload(file: File): Promise<PreparedPhoto> {
  const original = { blob: file, fileName: file.name || "anh.jpg" };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return original;
  }

  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= MAX_EDGE_PX && file.size <= KEEP_ORIGINAL_BYTES) return original;

    const scale = Math.min(1, MAX_EDGE_PX / longEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return original;
    // JPEG không có nền trong suốt: tô trắng trước để ảnh PNG có vùng trong suốt không thành nền đen.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToJpeg(canvas);
    // Hiếm khi bản nén lại lớn hơn bản gốc (ảnh gốc đã nén mạnh): giữ bản nhỏ hơn.
    if (!blob || blob.size >= file.size) return original;
    return { blob, fileName: toJpegName(file.name) };
  } finally {
    bitmap.close();
  }
}
