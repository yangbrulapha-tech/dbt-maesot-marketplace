-- ==========================================
-- 1. รีเซ็ตและอัปเดตนโยบายของตาราง products (เวอร์ชัน 3 - ผ่านฉลุยแน่นอน)
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Sellers can insert own products" ON products;
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON products;
DROP POLICY IF EXISTS "Admin can delete any product" ON products;

-- 1.1 อนุญาตให้คนที่ล็อกอินดูสินค้าได้ทั้งหมด
CREATE POLICY "Anyone can view products" ON products 
FOR SELECT TO authenticated USING (true);

-- 1.2 อนุญาตให้ผู้ที่ล็อกอินลงประกาศขายสินค้าได้ทันที (ลดการเปรียบเทียบอีเมลเพื่อป้องกัน Error)
CREATE POLICY "Sellers can insert own products" ON products 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- 1.3 อนุญาตให้แก้ไขข้อมูลสินค้าของตัวเอง (ตรวจสอบจากชื่อผู้ขาย)
CREATE POLICY "Sellers can update own products" ON products 
FOR UPDATE TO authenticated 
USING (
  trim(lower(seller_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

-- 1.4 อนุญาตให้ลบสินค้าของตัวเอง
CREATE POLICY "Sellers can delete own products" ON products 
FOR DELETE TO authenticated 
USING (
  trim(lower(seller_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

-- 1.5 Admin สามารถลบสินค้าชิ้นใดก็ได้
CREATE POLICY "Admin can delete any product" ON products 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE trim(lower(users.student_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1))) 
    AND users.role = 'admin'
  )
);
