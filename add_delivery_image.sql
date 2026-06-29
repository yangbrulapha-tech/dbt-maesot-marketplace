-- เพิ่มคอลัมน์สำหรับเก็บรูปหลักฐานการจัดส่งสินค้าของ Rider ในตาราง orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_image_url TEXT;
