-- สร้างตาราง notifications (หรือแทนที่ถ้ามีอยู่แล้ว)
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(student_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- เปิด RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ลบนโยบายเก่าถ้ามี
DROP POLICY IF EXISTS "ดูการแจ้งเตือนของตัวเอง" ON public.notifications;
DROP POLICY IF EXISTS "อัปเดตการแจ้งเตือนของตัวเอง" ON public.notifications;
DROP POLICY IF EXISTS "สร้างการแจ้งเตือนได้ทุกคน" ON public.notifications;

-- นโยบาย RLS: ดูได้เฉพาะของตัวเอง
CREATE POLICY "ดูการแจ้งเตือนของตัวเอง" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT student_id FROM public.users WHERE student_id = split_part(auth.jwt()->>'email', '@', 1)));

-- นโยบาย RLS: อัปเดตการอ่านของตัวเอง
CREATE POLICY "อัปเดตการแจ้งเตือนของตัวเอง" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT student_id FROM public.users WHERE student_id = split_part(auth.jwt()->>'email', '@', 1)));

-- นโยบาย RLS: ระบบสามารถ Insert ได้ทุกคน (เพราะแจ้งเตือนมักจะเกิดจาก action ของอีกคนส่งไปหาอีกคน)
CREATE POLICY "สร้างการแจ้งเตือนได้ทุกคน" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
