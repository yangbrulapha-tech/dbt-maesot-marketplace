-- เพิ่มคอลัมน์สำหรับเก็บรูปภาพโปรไฟล์ของผู้ใช้งานในตาราง users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
