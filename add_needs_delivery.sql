-- เพิ่มคอลัมน์สำหรับตรวจสอบคำขอใช้บริการ Rider ในตาราง orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_delivery BOOLEAN DEFAULT FALSE;
