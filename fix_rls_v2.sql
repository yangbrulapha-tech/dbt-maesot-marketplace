-- ==========================================
-- 1. รีเซ็ตและอัปเดตนโยบายของตาราง products
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Sellers can insert own products" ON products;
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON products;
DROP POLICY IF EXISTS "Admin can delete any product" ON products;

-- อนุญาตให้ผู้ที่ล็อกอินทุกคนดูสินค้าได้
CREATE POLICY "Anyone can view products" ON products 
FOR SELECT TO authenticated USING (true);

-- อนุญาตให้ผู้ที่ล็อกอินเพิ่มสินค้าที่เป็นของตนเองได้ (ตรวจจับจาก Email JWT)
CREATE POLICY "Sellers can insert own products" ON products 
FOR INSERT TO authenticated 
WITH CHECK (
  trim(lower(seller_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

-- อนุญาตให้ผู้ที่ล็อกอินแก้ไขสินค้าของตนเองได้
CREATE POLICY "Sellers can update own products" ON products 
FOR UPDATE TO authenticated 
USING (
  trim(lower(seller_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

-- อนุญาตให้ผู้ที่ล็อกอินลบสินค้าของตนเองได้
CREATE POLICY "Sellers can delete own products" ON products 
FOR DELETE TO authenticated 
USING (
  trim(lower(seller_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

-- อนุญาตให้ Admin ลบสินค้าใดๆ ก็ได้
CREATE POLICY "Admin can delete any product" ON products 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE trim(lower(users.student_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1))) 
    AND users.role = 'admin'
  )
);


-- ==========================================
-- 2. รีเซ็ตและอัปเดตนโยบายของตาราง users (ป้องกันปัญหาบันทึกข้อมูลนักเรียนไม่ได้)
-- ==========================================
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users viewable by authenticated" ON users;
DROP POLICY IF EXISTS "Users are viewable by authenticated" ON users;

CREATE POLICY "Users can insert own profile" ON users
FOR INSERT TO authenticated
WITH CHECK (
  trim(lower(student_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

CREATE POLICY "Users can update own profile" ON users
FOR UPDATE TO authenticated
USING (
  trim(lower(student_id)) = trim(lower(split_part(auth.jwt() ->> 'email', '@', 1)))
);

CREATE POLICY "Users viewable by authenticated" ON users
FOR SELECT TO authenticated
USING (true);
