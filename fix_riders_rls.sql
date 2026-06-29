-- 1. ลบนโยบายการแก้ไขและลบเดิมของตาราง riders (ถ้ามี)
DROP POLICY IF EXISTS "Admin or owner can update riders" ON riders;
DROP POLICY IF EXISTS "Admin can delete riders" ON riders;

-- 2. อนุญาตให้สมาชิกที่ผ่านการยืนยันตัวตนสามารถแก้ไขข้อมูลผู้สมัครไรเดอร์ได้ (รวมถึงแอดมินอนุมัติ)
CREATE POLICY "Anyone authenticated can update riders" ON riders 
FOR UPDATE TO authenticated USING (true);

-- 3. อนุญาตให้สมาชิกที่ผ่านการยืนยันตัวตนสามารถลบใบสมัครไรเดอร์ได้
CREATE POLICY "Anyone authenticated can delete riders" ON riders 
FOR DELETE TO authenticated USING (true);
