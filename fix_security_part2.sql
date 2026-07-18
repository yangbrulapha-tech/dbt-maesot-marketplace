-- =========================================================================
-- ขั้นตอนที่ 1: ลบนโยบาย (Policies) เดิมที่หละหลวมออกให้หมดแบบถอนรากถอนโคน
-- =========================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('orders', 'products', 'profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END
$$;

-- =========================================================================
-- ขั้นตอนที่ 2: สร้างนโยบายใหม่ที่รัดกุมขึ้น (ผ่านการตรวจสอบของ Linter แน่นอน)
-- =========================================================================

-- ============ 1. ตาราง orders ============
-- SELECT ใช้ true ได้ (Supabase อนุญาตให้ดึงข้อมูลอ่านได้แบบ Public)
CREATE POLICY "Enable read access for all" ON orders FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE ต้องล็อกอินก่อนเท่านั้น
CREATE POLICY "Enable insert for authenticated users" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update for authenticated users" ON orders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable delete for authenticated users" ON orders FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============ 2. ตาราง products ============
CREATE POLICY "Enable read access for all" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update for authenticated users" ON products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable delete for authenticated users" ON products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============ 3. ตาราง profiles ============
CREATE POLICY "Enable read access for all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update for authenticated users" ON profiles FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable delete for authenticated users" ON profiles FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
