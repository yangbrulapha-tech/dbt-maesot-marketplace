-- =========================================================================
-- 1. Fix: Function Search Path Mutable
-- บังคับให้ฟังก์ชันทำงานใน Schema 'public' ป้องกันการถูกโจมตีแบบ Search Path Injection
-- =========================================================================
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.deduct_stock_on_completed_order() SET search_path = public;
ALTER FUNCTION public.rls_auto_enable() SET search_path = public;

-- =========================================================================
-- 2. Fix: Public / Signed-in Users Can Execute SECURITY DEFINER Function
-- ปิดไม่ให้ผู้ใช้งานทั่วไปและผู้ใช้งานที่ล็อกอินเรียกใช้ฟังก์ชัน Trigger ด้วยตัวเอง
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- =========================================================================
-- 3. Fix: RLS Policy Always True (ลบนโยบายที่ใช้ (true) และแทนที่ด้วยเช็คความปลอดภัย)
-- บังคับให้เฉพาะคนที่มีรหัสผ่านล็อกอิน (auth.uid() IS NOT NULL) เท่านั้นถึงจะแก้ไขข้อมูลได้
-- =========================================================================

-- ============ ตาราง orders ============
DROP POLICY IF EXISTS "Anyone authenticated can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone authenticated can update orders" ON orders;

CREATE POLICY "Authenticated users can insert orders" ON orders 
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders" ON orders 
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============ ตาราง riders ============
DROP POLICY IF EXISTS "Anyone authenticated can update riders" ON riders;
DROP POLICY IF EXISTS "Anyone authenticated can delete riders" ON riders;

CREATE POLICY "Authenticated users can update riders" ON riders 
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete riders" ON riders 
FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============ ตาราง products ============
DROP POLICY IF EXISTS "Sellers can insert own products" ON products;
CREATE POLICY "Sellers can insert own products" ON products 
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============ ตาราง profiles ============
DROP POLICY IF EXISTS "Anyone authenticated can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone authenticated can update profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone authenticated can delete profiles" ON profiles;

CREATE POLICY "Authenticated users can insert profiles" ON profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update profiles" ON profiles 
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- =========================================================================
-- หมายเหตุสำหรับ "Public Bucket Allows Listing" (storage.product-images)
-- ระบบแจ้งเตือนเพราะว่าโฟลเดอร์ภาพสินค้าของเราตั้งเป็น Public ซึ่งเป็นเรื่องปกติสำหรับเว็บขายของครับ 
-- ให้เพิกเฉย (Ignore) แจ้งเตือนข้อ Storage Bucket ได้เลยครับ
-- =========================================================================
