import { createClient } from '@supabase/supabase-js'

// Hardcode credentials สำหรับ GitHub Pages (ไม่มี env variables)
const supabaseUrl = 'https://alhwuoozlzmrgttupctt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaHd1b296bHptcmd0dHVwY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTIxODUsImV4cCI6MjA2NjMyODE4NX0.sb_publishable_InBTPVK9JdKID0SzM9AIlQ_bQpfdqX7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * ดึงข้อมูล user จากตาราง profiles
 * Schema: id(bigserial PK), student_id(text UNIQUE), full_name, department, role, created_at
 * student_id ถูก derive จาก auth email: {student_id}@gmail.com
 */
export const getUserProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: authError || new Error('ไม่พบ session การเข้าสู่ระบบ') }
  }

  // Extract student_id จาก internal email: {student_id}@gmail.com
  const studentId = user.email?.split('@')[0]
  if (!studentId) {
    return { data: null, error: new Error('ไม่สามารถระบุรหัสนักศึกษาได้') }
  }

  // ใช้ maybeSingle() แทน single() เพื่อป้องกัน 406 เมื่อยังไม่มี profile
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  // ถ้าไม่มี profile ให้สร้างอัตโนมัติ
  if (!error && !data) {
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert({ student_id: studentId, full_name: '', department: '', role: 'student' })
      .select()
      .maybeSingle()
    return { data: newProfile, error: insertError }
  }

  return { data, error }
}
