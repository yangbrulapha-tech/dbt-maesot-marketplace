-- 1. ลบนโยบายตาราง products ทั้งหมด
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Sellers can insert own products" ON products;
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON products;
DROP POLICY IF EXISTS "Admin can delete any product" ON products;

-- 2. สร้างนโยบายการดึงข้อมูล (SELECT)
CREATE POLICY "Anyone can view products" ON products 
FOR SELECT TO authenticated USING (true);

-- 3. สร้างนโยบายการลงประกาศขาย (INSERT)
-- ตรวจสอบว่า seller_id ในแถวใหม่ ตรงกับ student_id จากตาราง users ที่ค้นหาด้วย email ของผู้ใช้ปัจจุบัน
CREATE POLICY "Sellers can insert own products" ON products 
FOR INSERT TO authenticated 
WITH CHECK (
  LOWER(seller_id) = LOWER(split_part(auth.email(), '@', 1))
);

-- 4. สร้างนโยบายการแก้ไขข้อมูล (UPDATE)
CREATE POLICY "Sellers can update own products" ON products 
FOR UPDATE TO authenticated 
USING (
  LOWER(seller_id) = LOWER(split_part(auth.email(), '@', 1))
);

-- 5. สร้างนโยบายการลบข้อมูล (DELETE)
CREATE POLICY "Sellers can delete own products" ON products 
FOR DELETE TO authenticated 
USING (
  LOWER(seller_id) = LOWER(split_part(auth.email(), '@', 1))
);

-- 6. สร้างนโยบายให้ Admin สามารถลบสินค้าชิ้นใดก็ได้
CREATE POLICY "Admin can delete any product" ON products 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE LOWER(users.student_id) = LOWER(split_part(auth.email(), '@', 1)) 
    AND users.role = 'admin'
  )
);
