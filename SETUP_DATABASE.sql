-- ================================================================
-- SHOP 2 MTC — COMPLETE DATABASE RESET (v2)
-- ใช้ student_id สม่ำเสมอทุกตาราง
-- รันใน: https://supabase.com/dashboard/project/alhwuoozlzmrgttupctt/sql/new
-- ================================================================

-- ============================================================
-- STEP 1: ลบทุกอย่างเดิมออก
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created          ON auth.users;
DROP TRIGGER IF EXISTS on_order_completed            ON public.orders;
DROP FUNCTION IF EXISTS public.handle_new_user()                   CASCADE;
DROP FUNCTION IF EXISTS public.deduct_stock_on_completed_order()   CASCADE;

DROP TABLE IF EXISTS public.notifications    CASCADE;
DROP TABLE IF EXISTS public.messages         CASCADE;
DROP TABLE IF EXISTS public.product_reports  CASCADE;
DROP TABLE IF EXISTS public.refund_requests  CASCADE;
DROP TABLE IF EXISTS public.orders           CASCADE;
DROP TABLE IF EXISTS public.riders           CASCADE;
DROP TABLE IF EXISTS public.products         CASCADE;
DROP TABLE IF EXISTS public.profiles         CASCADE;
DROP TABLE IF EXISTS public.users            CASCADE;
DROP TABLE IF EXISTS public.categories       CASCADE;

-- ============================================================
-- STEP 2: profiles — ข้อมูลผู้ใช้ทุกคน
-- student_id = เลขรหัสนักศึกษา (ใช้แทน user_id ทั่วระบบ)
-- ============================================================
CREATE TABLE public.profiles (
  id          BIGSERIAL    PRIMARY KEY,
  student_id  TEXT         UNIQUE NOT NULL,   -- รหัสนักศึกษา เช่น 66302040088
  full_name   TEXT         NOT NULL DEFAULT '',
  department  TEXT         DEFAULT '',
  role        TEXT         DEFAULT 'student', -- student | admin | staff
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 3: products — สินค้าที่ลงประกาศขาย
-- ============================================================
CREATE TABLE public.products (
  id          BIGSERIAL    PRIMARY KEY,
  seller_id   BIGINT       REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- seller_id อ้างอิง profiles.id (bigint) ไม่ใช่ student_id
  -- เพราะ Supabase ต้องการ FK ชี้ไปที่ PK ซึ่งเป็น bigint
  title       TEXT         NOT NULL,
  description TEXT         DEFAULT '',
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  category    TEXT         DEFAULT 'อื่นๆ',
  image_url   TEXT,
  status      TEXT         DEFAULT 'available', -- available | sold | deleted
  stock       INT          DEFAULT 1,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 4: orders — คำสั่งซื้อ
-- buyer_id / rider_id ใช้ชื่อบทบาทเพราะมีหลายคนในตารางเดียว
-- ============================================================
CREATE TABLE public.orders (
  id              BIGSERIAL    PRIMARY KEY,
  product_id      BIGINT       REFERENCES public.products(id) ON DELETE SET NULL,
  buyer_id        TEXT         NOT NULL,  -- profiles.student_id ของผู้ซื้อ
  rider_id        TEXT,                   -- profiles.student_id ของ rider
  status          TEXT         DEFAULT 'pending',
  needs_delivery  BOOLEAN      DEFAULT FALSE,
  seller_accepted BOOLEAN      DEFAULT FALSE,
  delivery_image  TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 5: riders — คนส่งของ
-- ============================================================
CREATE TABLE public.riders (
  student_id    TEXT         PRIMARY KEY REFERENCES public.profiles(student_id) ON DELETE CASCADE,
  vehicle_type  TEXT         DEFAULT 'motorbike',
  license_plate TEXT,
  is_active     BOOLEAN      DEFAULT TRUE,
  rating        NUMERIC(3,2) DEFAULT 5.0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 6: messages — ข้อความแชท
-- sender_id / receiver_id ใช้ชื่อบทบาทเพราะมีทั้งผู้ส่งและผู้รับ
-- ============================================================
CREATE TABLE public.messages (
  id          BIGSERIAL    PRIMARY KEY,
  sender_id   TEXT         NOT NULL,   -- profiles.student_id ผู้ส่ง
  receiver_id TEXT         NOT NULL,   -- profiles.student_id ผู้รับ
  product_id  BIGINT       REFERENCES public.products(id) ON DELETE SET NULL,
  content     TEXT         NOT NULL,
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 7: product_reports — แจ้งปัญหาสินค้า
-- ใช้ student_id แทน reporter_id (มีแค่คนเดียว)
-- ============================================================
CREATE TABLE public.product_reports (
  id          BIGSERIAL    PRIMARY KEY,
  student_id  TEXT         NOT NULL,  -- profiles.student_id ผู้แจ้ง
  product_id  BIGINT       REFERENCES public.products(id) ON DELETE SET NULL,
  message_content TEXT,
  image_url   TEXT,
  status      TEXT         DEFAULT 'pending',  -- pending | reviewed | resolved | dismissed
  admin_reply TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 8: refund_requests — ขอคืนเงิน
-- ใช้ student_id แทน buyer_id (มีแค่คนเดียว)
-- ============================================================
CREATE TABLE public.refund_requests (
  id          BIGSERIAL    PRIMARY KEY,
  student_id  TEXT         NOT NULL,  -- profiles.student_id ผู้ขอคืนเงิน
  order_id    BIGINT       REFERENCES public.orders(id) ON DELETE SET NULL,
  reason      TEXT,
  evidence_url TEXT,
  status      TEXT         DEFAULT 'pending',  -- pending | approved | rejected
  admin_reply TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 9: notifications — การแจ้งเตือน
-- ใช้ student_id (เลขนักศึกษา) แทน user_id
-- ============================================================
CREATE TABLE public.notifications (
  id          BIGSERIAL    PRIMARY KEY,
  student_id  TEXT         NOT NULL,   -- profiles.student_id ผู้รับแจ้งเตือน
  title       TEXT         NOT NULL,
  message     TEXT,
  link        TEXT         DEFAULT '/',
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- STEP 10: เปิด Row Level Security ทุกตาราง
-- ============================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 11: RLS Policies
-- ============================================================

-- profiles: ทุกคนดูได้, ล็อกอินแล้วแก้ได้
CREATE POLICY "profiles_select"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert"  ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update"  ON public.profiles FOR UPDATE  TO authenticated USING (auth.uid() IS NOT NULL);

-- products: ทุกคนดูได้, ล็อกอินแล้วจัดการได้
CREATE POLICY "products_select"  ON public.products FOR SELECT  USING (true);
CREATE POLICY "products_insert"  ON public.products FOR INSERT  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "products_update"  ON public.products FOR UPDATE  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_delete"  ON public.products FOR DELETE  TO authenticated USING (auth.uid() IS NOT NULL);

-- orders: ล็อกอินจัดการได้
CREATE POLICY "orders_select"    ON public.orders   FOR SELECT  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "orders_insert"    ON public.orders   FOR INSERT  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "orders_update"    ON public.orders   FOR UPDATE  TO authenticated USING (auth.uid() IS NOT NULL);

-- riders: ทุกคนดูได้
CREATE POLICY "riders_select"    ON public.riders   FOR SELECT  USING (true);
CREATE POLICY "riders_manage"    ON public.riders   FOR ALL     TO authenticated USING (auth.uid() IS NOT NULL);

-- messages: ล็อกอินจัดการได้
CREATE POLICY "messages_select"  ON public.messages FOR SELECT  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "messages_insert"  ON public.messages FOR INSERT  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "messages_update"  ON public.messages FOR UPDATE  TO authenticated USING (auth.uid() IS NOT NULL);

-- product_reports: ล็อกอินจัดการได้
CREATE POLICY "reports_select"   ON public.product_reports FOR SELECT  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "reports_insert"   ON public.product_reports FOR INSERT  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reports_update"   ON public.product_reports FOR UPDATE  TO authenticated USING (auth.uid() IS NOT NULL);

-- refund_requests: ล็อกอินจัดการได้
CREATE POLICY "refunds_select"   ON public.refund_requests FOR SELECT  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "refunds_insert"   ON public.refund_requests FOR INSERT  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "refunds_update"   ON public.refund_requests FOR UPDATE  TO authenticated USING (auth.uid() IS NOT NULL);

-- notifications: ล็อกอินจัดการได้
CREATE POLICY "notif_all"        ON public.notifications   FOR ALL     TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 12: Trigger — สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (student_id, full_name, department, role)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'student_id', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name',  ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'role',       'student')
  )
  ON CONFLICT (student_id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name,  profiles.full_name),
    department = COALESCE(EXCLUDED.department, profiles.department);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 13: Trigger — หักสต็อกเมื่อออเดอร์เสร็จ
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_stock_on_completed_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.products
    SET stock  = GREATEST(stock - 1, 0),
        status = CASE WHEN stock - 1 <= 0 THEN 'sold' ELSE status END
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_completed_order();

-- ============================================================
-- STEP 14: Indexes
-- ============================================================
CREATE INDEX idx_products_seller     ON public.products(seller_id);
CREATE INDEX idx_products_status     ON public.products(status);
CREATE INDEX idx_products_category   ON public.products(category);
CREATE INDEX idx_orders_buyer        ON public.orders(buyer_id);
CREATE INDEX idx_orders_rider        ON public.orders(rider_id);
CREATE INDEX idx_orders_status       ON public.orders(status);
CREATE INDEX idx_messages_sender     ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver   ON public.messages(receiver_id);
CREATE INDEX idx_reports_student     ON public.product_reports(student_id);
CREATE INDEX idx_refunds_student     ON public.refund_requests(student_id);
CREATE INDEX idx_notif_student       ON public.notifications(student_id);
CREATE INDEX idx_profiles_student    ON public.profiles(student_id);

-- ============================================================
-- STEP 15: สร้าง admin profile + สร้าง profile สำหรับ user เก่า
-- ============================================================
INSERT INTO public.profiles (student_id, full_name, department, role)
VALUES ('admin01', 'ผู้ดูแลระบบ', 'บุคลากร/เจ้าหน้าที่', 'admin')
ON CONFLICT (student_id) DO UPDATE SET role = 'admin';

-- สร้าง profile สำหรับ auth users ที่มีอยู่แล้ว
INSERT INTO public.profiles (student_id, full_name, department, role)
SELECT split_part(email, '@', 1), '', '', 'student'
FROM auth.users
WHERE split_part(email, '@', 1) NOT IN (SELECT student_id FROM public.profiles)
ON CONFLICT (student_id) DO NOTHING;

-- ============================================================
-- ตรวจสอบผลลัพธ์
-- ============================================================
SELECT tablename, rowsecurity AS rls_on FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
