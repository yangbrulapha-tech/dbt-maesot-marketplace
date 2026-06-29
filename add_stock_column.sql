-- 1. เพิ่มคอลัมน์ stock ในตาราง products (ค่าเริ่มต้นเป็น 1 ชิ้น)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 1;

-- 2. สร้าง Trigger อัจฉริยะ: เมื่อออเดอร์ปรับสถานะเป็น 'completed' (สำเร็จ)
-- ระบบจะหักสต็อกสินค้าชิ้นนั้นลง 1
-- หากสต็อกเป็น 0 (หรือติดลบ) ระบบจะเปลี่ยนสถานะสินค้าเป็น 'sold_out' ทันทีเพื่อเอาออกจากหน้าเว็บ
CREATE OR REPLACE FUNCTION deduct_stock_on_completed_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- ลดจำนวนสต็อกลง 1
    UPDATE products 
    SET stock = COALESCE(stock, 1) - 1
    WHERE product_id = NEW.product_id;
    
    -- หากสินค้าในคลังหมดแล้ว ปรับสถานะเป็น sold_out ทันที เพื่อนำออกจากประกาศขาย
    UPDATE products
    SET status = 'sold_out'
    WHERE product_id = NEW.product_id AND stock <= 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. ผูก Trigger เข้ากับตาราง orders
DROP TRIGGER IF EXISTS trg_deduct_stock_on_completed ON orders;
CREATE TRIGGER trg_deduct_stock_on_completed
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_completed_order();
