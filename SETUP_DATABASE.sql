-- ================================================================
-- SHOP 2 MTC — COMPLETE DATABASE + STORAGE SETUP
-- รัน SQL นี้ครั้งเดียวจบทุกอย่าง
-- URL: https://supabase.com/dashboard/project/alhwuoozlzmrgttupctt/sql/new
-- ================================================================

-- ============================================================
-- STEP 1: ลบทุกอย่างเดิมออกก่อน
-- ============================================================

-- ลบ triggers เดิม
DROP TRIGGER IF EXISTS on_auth_user_created       ON auth.users;
DROP TRIGGER IF EXISTS on_order_completed         ON public.orders;

-- ลบ functions เดิม
DROP FUNCTION IF EXISTS public.handle_new_user()                    CASCADE;
DROP FUNCTION IF EXISTS public.deduct_stock_on_completed_order()    CASCADE;
DROP FUNCTION IF EXISTS public.rls_auto_enable()                    CASCADE;

-- ลบตารางเดิม (ลำดับตาม dependency)
DROP TABLE IF EXISTS public.messages          CASCADE;
DROP TABLE IF EXISTS public.product_reports   CASCADE;
DROP TABLE IF EXISTS public.refund_requests   CASCADE;
DROP TABLE IF EXISTS public.orders            CASCADE;
DROP TABLE IF EXISTS public.riders            CASCADE;
DROP TABLE IF EXISTS public.products          CASCADE;
DROP TABLE IF EXISTS public.profiles          CASCADE;
DROP TABLE IF EXISTS public.users             CASCADE;
DROP TABLE IF EXISTS public.categories        CASCADE;

-- ลบ Storage buckets เดิมและ policies
DELETE FROM storage.objects  WHERE bucket_id IN ('product-images', 'refund-evidence', 'delivery-images');
DELETE FROM storage.buckets  WHERE id        IN ('product-images', 'refund-evidence', 'delivery-images');

-- ============================================================
-- STEP 2: สร้างตาราง profiles (ข้อมูลผู้ใช้)
-- ============================================================
CREATE TABLE public.profiles (
  id            BIGSERIAL PRIMARY KEY,
  student_id    TEXT        UNIQUE NOT NULL,
  full_name     TEXT        NOT NULL DEFAULT '',
  department    TEXT        DEFAULT '',
  role          TEXT        DEFAULT 'student',  -- student | admin | staff
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: สร้างตาราง products (สินค้าที่ลงประกาศ)
-- ============================================================
CREATE TABLE public.products (
  id            BIGSERIAL   PRIMARY KEY,
  seller_id     BIGINT      REFERENCES public.profiles(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  description   TEXT        DEFAULT '',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  category      TEXT        DEFAULT 'อื่นๆ',
  image_url     TEXT,
  status        TEXT        DEFAULT 'available',  -- available | sold | deleted
  stock         INT         DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 4: สร้างตาราง orders (คำสั่งซื้อ)
-- ============================================================
CREATE TABLE public.orders (
  id              BIGSERIAL   PRIMARY KEY,
  product_id      BIGINT      REFERENCES public.products(id) ON DELETE SET NULL,
  buyer_id        TEXT        NOT NULL,   -- profiles.student_id
  rider_id        TEXT,                   -- profiles.student_id ของ rider
  status          TEXT        DEFAULT 'pending',
  -- pending | seller_accepted | shipping | completed | cancelled | refund_requested | refunded
  needs_delivery  BOOLEAN     DEFAULT FALSE,
  seller_accepted BOOLEAN     DEFAULT FALSE,
  delivery_image  TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 5: สร้างตาราง riders (คนส่งของ)
-- ============================================================
CREATE TABLE public.riders (
  student_id    TEXT        PRIMARY KEY REFERENCES public.profiles(student_id) ON DELETE CASCADE,
  vehicle_type  TEXT        DEFAULT 'motorbike',
  license_plate TEXT,
  is_active     BOOLEAN     DEFAULT TRUE,
  rating        NUMERIC(3,2) DEFAULT 5.0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 6: สร้างตาราง messages (แชท)
-- ============================================================
CREATE TABLE public.messages (
  id            BIGSERIAL   PRIMARY KEY,
  sender_id     TEXT        NOT NULL,    -- profiles.student_id
  receiver_id   TEXT        NOT NULL,    -- profiles.student_id
  product_id    BIGINT      REFERENCES public.products(id) ON DELETE SET NULL,
  content       TEXT        NOT NULL,
  is_read       BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 7: สร้างตาราง product_reports (แจ้งปัญหาสินค้า)
-- ============================================================
CREATE TABLE public.product_reports (
  id              BIGSERIAL   PRIMARY KEY,
  reporter_id     TEXT        NOT NULL,  -- profiles.student_id
  product_id      BIGINT      REFERENCES public.products(id) ON DELETE SET NULL,
  message_content TEXT,
  image_url       TEXT,
  status          TEXT        DEFAULT 'pending',   -- pending | reviewed | resolved | dismissed
  admin_reply     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 8: สร้างตาราง refund_requests (ขอคืนเงิน)
-- ============================================================
CREATE TABLE public.refund_requests (
  id            BIGSERIAL   PRIMARY KEY,
  buyer_id      TEXT        NOT NULL,   -- profiles.student_id
  order_id      BIGINT      REFERENCES public.orders(id) ON DELETE SET NULL,
  reason        TEXT,
  evidence_url  TEXT,
  status        TEXT        DEFAULT 'pending',  -- pending | approved | rejected
  admin_reply   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 9: เปิด Row Level Security ทุกตาราง
-- ============================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 10: RLS Policies — profiles
-- ============================================================
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_open"
  ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_auth"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 11: RLS Policies — products
-- ============================================================
CREATE POLICY "products_select_public"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "products_insert_auth"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_update_auth"
  ON public.products FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_delete_auth"
  ON public.products FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 12: RLS Policies — orders
-- ============================================================
CREATE POLICY "orders_select_auth"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "orders_insert_auth"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orders_update_auth"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 13: RLS Policies — riders
-- ============================================================
CREATE POLICY "riders_select_public"
  ON public.riders FOR SELECT USING (true);

CREATE POLICY "riders_manage_auth"
  ON public.riders FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 14: RLS Policies — messages
-- ============================================================
CREATE POLICY "messages_select_auth"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "messages_insert_auth"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "messages_update_auth"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 15: RLS Policies — product_reports
-- ============================================================
CREATE POLICY "reports_select_auth"
  ON public.product_reports FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "reports_insert_auth"
  ON public.product_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "reports_update_auth"
  ON public.product_reports FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 16: RLS Policies — refund_requests
-- ============================================================
CREATE POLICY "refunds_select_auth"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "refunds_insert_auth"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "refunds_update_auth"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 17: Trigger — สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (student_id, full_name, department, role)
  VALUES (
    COALESCE(
      NEW.raw_user_meta_data->>'student_id',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
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
-- STEP 18: Trigger — หักสต็อกเมื่อออเดอร์เสร็จ
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_stock_on_completed_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.products
    SET
      stock  = GREATEST(stock - 1, 0),
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
-- STEP 19: Performance Indexes
-- ============================================================
CREATE INDEX idx_products_seller_id  ON public.products(seller_id);
CREATE INDEX idx_products_status     ON public.products(status);
CREATE INDEX idx_products_category   ON public.products(category);
CREATE INDEX idx_orders_buyer_id     ON public.orders(buyer_id);
CREATE INDEX idx_orders_rider_id     ON public.orders(rider_id);
CREATE INDEX idx_orders_status       ON public.orders(status);
CREATE INDEX idx_orders_product_id   ON public.orders(product_id);
CREATE INDEX idx_messages_sender     ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver   ON public.messages(receiver_id);
CREATE INDEX idx_messages_product    ON public.messages(product_id);
CREATE INDEX idx_reports_reporter    ON public.product_reports(reporter_id);
CREATE INDEX idx_refunds_buyer       ON public.refund_requests(buyer_id);
CREATE INDEX idx_profiles_student    ON public.profiles(student_id);

-- ============================================================
-- STEP 20: Storage Buckets + Policies
-- ============================================================

-- สร้าง Bucket: product-images (สำหรับรูปสินค้า)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- สร้าง Bucket: refund-evidence (สำหรับหลักฐานขอคืนเงิน)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'refund-evidence',
  'refund-evidence',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- สร้าง Bucket: delivery-images (สำหรับรูปยืนยันการส่ง)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-images',
  'delivery-images',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: product-images
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- Storage RLS: refund-evidence
CREATE POLICY "refund_evidence_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'refund-evidence');

CREATE POLICY "refund_evidence_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'refund-evidence');

-- Storage RLS: delivery-images
CREATE POLICY "delivery_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-images');

CREATE POLICY "delivery_images_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-images');

-- ============================================================
-- STEP 21: สร้าง admin profile เริ่มต้น
-- ============================================================
INSERT INTO public.profiles (student_id, full_name, department, role)
VALUES
  ('admin01', 'ผู้ดูแลระบบ', 'บุคลากร/เจ้าหน้าที่', 'admin')
ON CONFLICT (student_id) DO UPDATE SET role = 'admin';

-- ============================================================
-- ตรวจสอบผลลัพธ์สุดท้าย
-- ============================================================
SELECT '=== TABLES ===' AS info;
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

SELECT '=== STORAGE BUCKETS ===' AS info;
SELECT id, name, public FROM storage.buckets ORDER BY name;

SELECT '=== TRIGGERS ===' AS info;
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema IN ('public','auth') ORDER BY trigger_name;
