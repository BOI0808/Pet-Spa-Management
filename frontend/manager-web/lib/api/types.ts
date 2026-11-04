// Kiểu dữ liệu chép đúng backend/docs/api/openapi.yaml (phần phiên đăng nhập, danh mục dịch vụ, chuồng và giá lưu trú).

export type Role = "Customer" | "Staff" | "Manager";
type StaffRole = "Receptionist" | "SpaStaff";
export type Species = "Dog" | "Cat" | "Rabbit" | "GuineaPig";
export type SizeGroup = "Small" | "Medium" | "Large";

/** GET /me */
export type Me = {
  userId: string;
  userName: string;
  role: Role;
  staffRole?: StaffRole | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LoginRequest = {
  userName: string;
  password: string;
};

/** Phản hồi của POST /auth/login và POST /auth/refresh. */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

// Hai kiểu dưới đây là phản hồi của route handler `app/api/session/*` của web, không phải schema của openapi.yaml.
export type SessionLoginResponse = {
  accessToken: string;
  me: Me;
};

export type SessionRefreshResponse = {
  accessToken: string;
};

// ── Danh mục dịch vụ (FR-SVC) ──

/** Giá, thời lượng, số nhân viên của một dịch vụ cho một loài và một nhóm kích cỡ. Giá là số nguyên VND. */
export type PricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  price: number;
  durationMinutes: number;
  staffRequired: 1 | 2;
};

/** GET /services – Quản lý nhận cả dịch vụ đã ngừng (`isActive = false`). */
export type Service = {
  serviceId: string;
  name: string;
  description?: string | null;
  /** Mốc giờ bắt đầu muộn nhất, dạng HH:mm. */
  latestStartTime: string;
  isActive: boolean;
  pricing: PricingRow[];
};

/** Body của POST /services và PUT /services/{id}. */
export type ServiceRequest = {
  name: string;
  description?: string;
  latestStartTime: string;
  pricing: PricingRow[];
};

export type ServiceCreated = { serviceId: string };

/** Body của PATCH /services/{id}/status. */
export type ActiveToggleRequest = { isActive: boolean };

// ── Chuồng và giá lưu trú (FR-HTL-01 → 03) ──

/** Giá lưu trú và giá thức ăn mỗi đêm của một loài và một nhóm kích cỡ (BR-22). Giá là số nguyên VND. */
export type HotelPricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  pricePerNight: number;
  foodPerNight: number;
};

/** GET và PUT /hotel/pricing. `lateFeePerBlock` là phí phạt mỗi lần trả muộn, VND (BR-22). */
export type HotelPricing = {
  pricing: HotelPricingRow[];
  lateFeePerBlock: number;
};

/** Chuồng. `occupant` (đang chứa) chỉ có ở GET /cages nên thêm vào khi làm thẻ 150. */
export type Cage = {
  cageId: string;
  code: string;
  species: Species;
  sizeGroup: SizeGroup;
  isActive: boolean;
};

/** Body của POST /cages. */
export type CageCreateRequest = {
  code: string;
  species: Species;
  sizeGroup: SizeGroup;
};

/** Body của PUT /cages/{id}: mọi trường tùy chọn, chỉ trường được gửi mới đổi. */
export type CageUpdateRequest = Partial<CageCreateRequest>;

export type CageCreated = { cageId: string };
