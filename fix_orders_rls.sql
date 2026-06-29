-- 1. ลบนโยบายจำกัดสิทธิ์ SELECT และ UPDATE เก่าของตาราง orders
DROP POLICY IF EXISTS "Orders visible to buyer and seller" ON orders;
DROP POLICY IF EXISTS "Orders visible to parties" ON orders;
DROP POLICY IF EXISTS "Seller can update order status" ON orders;
DROP POLICY IF EXISTS "Buyers can insert orders" ON orders;

-- 2. อนุญาตให้สมาชิกที่ผ่านการยืนยันตัวตน (authenticated) ทั้งหมดมองเห็นรายการออเดอร์ได้ (เพื่อให้ Rider เห็นงาน)
CREATE POLICY "Anyone authenticated can view orders" ON orders 
FOR SELECT TO authenticated USING (true);

-- 3. อนุญาตให้สมาชิกที่ผ่านการยืนยันตัวตน สามารถกดสั่งซื้อออเดอร์ใหม่ได้
CREATE POLICY "Anyone authenticated can insert orders" ON orders 
FOR INSERT TO authenticated WITH CHECK (true);

-- 4. อนุญาตให้สมาชิกอัปเดตสถานะออเดอร์ได้ (รวมถึง Rider ที่รับงานจัดส่ง)
CREATE POLICY "Anyone authenticated can update orders" ON orders 
FOR UPDATE TO authenticated USING (true);
