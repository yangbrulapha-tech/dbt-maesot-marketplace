-- =======================================================
-- สคริปต์เพิ่มข้อมูลออเดอร์ตัวอย่างสำหรับการทดสอบระบบไรเดอร์
-- =======================================================

-- ป้องกันข้อผิดพลาดกรณีไม่มีสินค้าในตาราง products เลย
-- (ระบบจะสร้างสินค้าตัวอย่างให้ 1 ชิ้นหากตารางว่างเปล่า)
INSERT INTO products (title, description, price, category, status, seller_id, image_url)
SELECT 'หนังสือวิชาเขียนแบบ', 'สภาพดีมาก 95% ไม่มีรอยขีดเขียน', 150.00, 'books', 'available', 'admin01', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'
WHERE NOT EXISTS (SELECT 1 FROM products);

-- 1. เพิ่มออเดอร์ตัวอย่างที่ 1: "รอ Rider กดรับงานจัดส่ง" (Needs Rider, Rider is NULL, Status is pending)
-- ออเดอร์นี้จะโชว์ในหน้า "Rider -> งานจัดส่งทั่วไป"
INSERT INTO orders (product_id, buyer_id, rider_id, status, needs_delivery, created_at)
VALUES (
  (SELECT product_id FROM products LIMIT 1),
  'admin01', -- รหัสนักศึกษาคนซื้อ
  NULL,      -- ยังไม่มีใครรับงาน
  'pending', -- สถานะรอดำเนินการ
  TRUE,      -- ระบุว่า "ต้องการไรเดอร์ส่งของ"
  NOW() - INTERVAL '1 hour'
);

-- 2. เพิ่มออเดอร์ตัวอย่างที่ 2: "Rider รับงานแล้ว กำลังไปส่งของ" (Rider is assigned, Status is shipping)
-- ออเดอร์นี้จะโชว์ในหน้า "Rider -> งานจัดส่งปัจจุบัน" และหน้าออเดอร์ของผู้ซื้อ
INSERT INTO orders (product_id, buyer_id, rider_id, status, needs_delivery, created_at)
VALUES (
  (SELECT product_id FROM products LIMIT 1),
  'admin01',
  '66302040088', -- รหัสของคนที่เป็น Rider (จากรูปภาพตัวอย่างคุณ)
  'shipping',    -- สถานะกำลังนำส่ง
  TRUE,
  NOW() - INTERVAL '30 minutes'
);

-- 3. เพิ่มออเดอร์ตัวอย่างที่ 3: "ส่งของสำเร็จเรียบร้อย มีรูปหลักฐาน" (Rider is assigned, Status is completed, Delivery image exists)
-- ออเดอร์นี้จะโชว์ในหน้า "Rider -> ประวัติส่งของสำเร็จ" และหน้าออเดอร์ของผู้ซื้อเพื่อดูรูปหลักฐาน
INSERT INTO orders (product_id, buyer_id, rider_id, status, needs_delivery, delivery_image_url, created_at)
VALUES (
  (SELECT product_id FROM products LIMIT 1),
  'admin01',
  '66302040088',
  'completed', -- จัดส่งเรียบร้อย
  TRUE,
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600', -- ลิงก์รูปตัวอย่างกล่องสินค้าจัดส่งสำเร็จ
  NOW() - INTERVAL '1 day'
);
