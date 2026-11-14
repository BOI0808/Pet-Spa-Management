-- ======================================================================================
-- Script seed ca làm việc (WorkShift) & Lịch hẹn Spa mẫu (Appointment) cho Web Nhân viên
-- Hỗ trợ kiểm thử SW-02, SW-03, SW-06 (thẻ 124, 130)
-- Múi giờ cửa hàng: Asia/Ho_Chi_Minh (+07:00). Giờ trong DB lưu UTC.
-- ======================================================================================

-- 1. Thêm ca làm việc từ 16/11/2026 đến 22/11/2026 (08:00 - 20:00 VN = 01:00 - 13:00 UTC)
-- Cho 3 nhân viên spa:
-- - 0900000302 (Vinh Nhân viên spa thử)
-- - 0900000202 (Postman Nhân viên spa)
-- - 0900000002 (Spa B)

DO $$
DECLARE
  v_staff_id UUID;
  v_date DATE;
  v_shift_start TIMESTAMPTZ;
  v_shift_end TIMESTAMPTZ;
  r RECORD;
BEGIN
  FOR r IN
    SELECT st."StaffId", u."UserName"
    FROM "Staff" st
    JOIN "AppUser" u ON st."UserId" = u."Id"
    WHERE u."UserName" IN ('0900000302', '0900000202', '0900000002')
      AND st."StaffRole" = 'SpaStaff'
  LOOP
    FOR v_date IN
      SELECT d::date FROM generate_series('2026-11-16'::date, '2026-11-22'::date, '1 day'::interval) d
    LOOP
      -- 08:00 VN = 01:00 UTC, 20:00 VN = 13:00 UTC
      v_shift_start := (v_date || ' 01:00:00+00')::timestamptz;
      v_shift_end   := (v_date || ' 13:00:00+00')::timestamptz;

      IF NOT EXISTS (
        SELECT 1 FROM "WorkShift"
        WHERE "StaffId" = r."StaffId"
          AND "ShiftStart" < v_shift_end
          AND "ShiftEnd" > v_shift_start
      ) THEN
        INSERT INTO "WorkShift" ("ShiftId", "StaffId", "ShiftStart", "ShiftEnd")
        VALUES (gen_random_uuid(), r."StaffId", v_shift_start, v_shift_end);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 2. Thêm lịch hẹn spa mẫu cho nhân viên 0900000302
-- Khách: 0900000311 (Vinh Khách thử)
-- Thú cưng: Bé thuộc khách 0900000311
-- Dịch vụ: Tắm, sấy và vệ sinh cao cấp

DO $$
DECLARE
  v_staff_id UUID;
  v_customer_id UUID;
  v_pet_id UUID;
  v_service_id UUID;
  v_appt_id UUID;
  v_slot_start TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_busy_until TIMESTAMPTZ;
BEGIN
  -- Lấy StaffId của 0900000302
  SELECT st."StaffId" INTO v_staff_id
  FROM "Staff" st
  JOIN "AppUser" u ON st."UserId" = u."Id"
  WHERE u."UserName" = '0900000302';

  -- Lấy CustomerId và PetId của 0900000311
  SELECT c."CustomerId" INTO v_customer_id
  FROM "Customer" c
  WHERE c."Phone" = '0900000311';

  SELECT p."PetId" INTO v_pet_id
  FROM "Pet" p
  WHERE p."CustomerId" = v_customer_id
  LIMIT 1;

  -- Lấy dịch vụ Tắm, sấy và vệ sinh cao cấp
  SELECT s."ServiceId" INTO v_service_id
  FROM "Service" s
  WHERE s."Name" = 'Tắm, sấy và vệ sinh cao cấp'
  LIMIT 1;

  IF v_staff_id IS NOT NULL AND v_customer_id IS NOT NULL AND v_pet_id IS NOT NULL AND v_service_id IS NOT NULL THEN
    -- Mẫu 1: Lịch hẹn 17/11 10:00 VN (03:00 UTC) - Confirmed
    v_slot_start := '2026-11-17 03:00:00+00'::timestamptz;
    v_slot_end   := '2026-11-17 04:00:00+00'::timestamptz;
    v_busy_until := '2026-11-17 04:15:00+00'::timestamptz;

    IF NOT EXISTS (SELECT 1 FROM "AppointmentStaff" WHERE "StaffId" = v_staff_id AND "BusyFrom" = v_slot_start) THEN
      v_appt_id := gen_random_uuid();
      INSERT INTO "Appointment" ("AppointmentId", "CustomerId", "PetId", "Status", "SizeGroup", "SlotStart", "SlotEnd", "BusyUntil", "StaffRequired", "CreatedAt", "UpdatedAt", "Type")
      VALUES (v_appt_id, v_customer_id, v_pet_id, 'Confirmed', 'Small', v_slot_start, v_slot_end, v_busy_until, 1, now(), now(), 'Spa');

      INSERT INTO "AppointmentService" ("AppointmentId", "ServiceId", "IsDone")
      VALUES (v_appt_id, v_service_id, false);

      INSERT INTO "AppointmentStaff" ("AppointmentId", "StaffId", "BusyFrom", "BusyUntil", "IsHolding", "AssignedAt")
      VALUES (v_appt_id, v_staff_id, v_slot_start, v_busy_until, true, now());
    END IF;

    -- Mẫu 2: Lịch hẹn 18/11 14:00 VN (07:00 UTC) - Confirmed
    v_slot_start := '2026-11-18 07:00:00+00'::timestamptz;
    v_slot_end   := '2026-11-18 08:00:00+00'::timestamptz;
    v_busy_until := '2026-11-18 08:15:00+00'::timestamptz;

    IF NOT EXISTS (SELECT 1 FROM "AppointmentStaff" WHERE "StaffId" = v_staff_id AND "BusyFrom" = v_slot_start) THEN
      v_appt_id := gen_random_uuid();
      INSERT INTO "Appointment" ("AppointmentId", "CustomerId", "PetId", "Status", "SizeGroup", "SlotStart", "SlotEnd", "BusyUntil", "StaffRequired", "CreatedAt", "UpdatedAt", "Type")
      VALUES (v_appt_id, v_customer_id, v_pet_id, 'Confirmed', 'Small', v_slot_start, v_slot_end, v_busy_until, 1, now(), now(), 'Spa');

      INSERT INTO "AppointmentService" ("AppointmentId", "ServiceId", "IsDone")
      VALUES (v_appt_id, v_service_id, false);

      INSERT INTO "AppointmentStaff" ("AppointmentId", "StaffId", "BusyFrom", "BusyUntil", "IsHolding", "AssignedAt")
      VALUES (v_appt_id, v_staff_id, v_slot_start, v_busy_until, true, now());
    END IF;
  END IF;
END $$;

