-- เพิ่มคอลัมน์ delivery_location ลงในตาราง orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_location TEXT;
