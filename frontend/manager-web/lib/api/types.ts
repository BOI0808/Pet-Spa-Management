// Kiểu dữ liệu chép đúng backend/docs/api/openapi.yaml (phần phiên đăng nhập, danh mục dịch vụ, chuồng, giá lưu trú và nhân viên).

export type Role = "Customer" | "Staff" | "Manager";
export type StaffRole = "Receptionist" | "SpaStaff";
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

// ── Nhân viên (FR-STF-01 → 03) ──

/** Một nhân viên trong `items` của GET /staff (gồm cả người đã vô hiệu hóa). Chưa có ngày tạo, ngày vô hiệu hóa (UI-Screens G-09). */
export type StaffMember = {
  staffId: string;
  /** Số điện thoại, dùng làm tên đăng nhập. */
  userName: string;
  fullName: string;
  staffRole: StaffRole;
  isActive: boolean;
};

/** Phản hồi của GET /staff: thông tin trang (PageInfo) kèm `items`. */
export type StaffPage = {
  page: number;
  pageSize: number;
  total: number;
  items: StaffMember[];
};

/** Body của POST /staff. Không có `role`: backend luôn đặt Role = Staff (API-Notes 3). */
export type StaffCreateRequest = {
  userName: string;
  fullName: string;
  staffRole: StaffRole;
  password: string;
};

export type StaffCreated = { staffId: string };

/** Body của PUT /staff/{id}. Số điện thoại không đổi ở endpoint này. */
export type StaffUpdateRequest = {
  fullName: string;
  staffRole: StaffRole;
};

/** Phản hồi của POST /staff/{id}/deactivate: số lịch spa “Đã xác nhận” đã về “Chờ xác nhận” (BR-27). */
export type DeactivateResult = { returnedToPending: number };

// ── Lịch hẹn và hồ sơ thú cưng (FR-ASG-01, FR-PET-02) ──
export type Temperament = "Calm" | "Normal" | "Difficult";
export type AppointmentType = "Spa" | "Hotel";
export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Received"
  | "InProgress"
  | "InStay"
  | "Completed"
  | "Cancelled";

/** Thông tin trang (PageInfo) của các phản hồi danh sách; `items` là phần tử của trang. */
export type PageInfo = { page: number; pageSize: number; total: number };
export type Page<T> = PageInfo & { items: T[] };

/**
 * Một dòng của GET /appointments (schema Appointment). Chỉ khai báo các trường MW-04 dùng;
 * thêm trường khi màn khác cần. `customerName`, `petName` là trường đề xuất của openapi nhưng backend đã trả.
 * Lịch Spa có `slotStart`/`slotEnd`; lịch Hotel có `plannedCheckIn`/`plannedCheckOut`.
 */
export type Appointment = {
  appointmentId: string;
  type: AppointmentType;
  customerId: string;
  petId: string;
  customerName?: string;
  petName?: string;
  status: AppointmentStatus;
  sizeGroup: SizeGroup;
  slotStart?: string | null;
  slotEnd?: string | null;
  plannedCheckIn?: string | null;
  plannedCheckOut?: string | null;
  createdAt: string;
};

/** Phản hồi của GET /appointments. */
export type AppointmentPage = Page<Appointment>;

/** GET /pets/{petId} (schema Pet). Quản lý chỉ xem (FR-PET-02). */
export type Pet = {
  petId: string;
  customerId: string;
  name: string;
  species: Species;
  breed: string;
  temperament: Temperament;
  weightKg: number;
  heightCm?: number | null;
  coatNote?: string | null;
  notes?: string | null;
  sizeGroup: SizeGroup;
  isActive: boolean;
};

// ── Đề xuất chuồng, xác nhận, từ chối lịch lưu trú (FR-HTL-05, FR-HTL-06) ──

/**
 * GET /appointments/{id}/suggestions của lịch lưu trú (schema HotelSuggestions). `cage` là `null` khi không còn chuồng
 * phù hợp trống trong cả các đêm (backend trả `{ "cage": null }`, openapi ghi bắt buộc); vắng mặt cũng coi như không có.
 */
export type HotelSuggestions = { cage?: Cage | null };

/** Body của POST /appointments/{id}/confirm cho lịch lưu trú (schema ConfirmHotelRequest). */
export type ConfirmHotelRequest = { cageId: string };

/** Phản hồi của POST /appointments/{id}/confirm (schema StatusResult). */
export type StatusResult = { status: AppointmentStatus };

/** Phản hồi của POST /appointments/{id}/reject (schema RejectResult). */
export type RejectResult = { status: "Cancelled"; reason: "StoreUnable" };

// ── Đề xuất nhân viên, xác nhận lịch spa (FR-ASG-01 → 03) ──

/** Một dòng của `suggested` / `alternatives` trong GET /appointments/{id}/suggestions của lịch spa (schema StaffSuggestion). */
export type StaffSuggestion = {
  staffId: string;
  fullName: string;
  /** Số lịch được phân công trong `Suggest.LookbackDays` (30) ngày gần nhất. */
  recentAssignmentCount?: number;
};

/**
 * GET /appointments/{id}/suggestions của lịch spa (schema SpaSuggestions). `suggested` là đủ `staffRequired` người (ít hơn khi cửa hàng
 * không đủ nhân viên phù hợp); `alternatives` là các nhân viên phù hợp còn lại. Cả hai chỉ gồm người có ca phủ khung giờ và không trùng lịch.
 */
export type SpaSuggestions = {
  staffRequired: 1 | 2;
  suggested: StaffSuggestion[];
  alternatives: StaffSuggestion[];
};

/** Body của POST /appointments/{id}/confirm cho lịch spa (schema ConfirmSpaRequest). `confirmOutOfShift` chỉ gửi `true` sau khi Quản lý đồng ý (MW-04·D2). */
export type ConfirmSpaRequest = {
  staffIds: string[];
  confirmOutOfShift?: true;
};

/** Một dịch vụ trong `services` của GET /appointments/{id} (schema AppointmentServiceItem); lịch spa mới có. */
export type AppointmentServiceItem = {
  serviceId: string;
  name?: string;
  isDone: boolean;
  doneAt?: string | null;
  note?: string | null;
};

/** GET /appointments/{id} (schema AppointmentDetail). Chỉ khai báo `services` mà MW-04 cần để nêu tên dịch vụ và tính tạm tính. */
export type AppointmentDetail = Appointment & {
  services?: AppointmentServiceItem[];
};
