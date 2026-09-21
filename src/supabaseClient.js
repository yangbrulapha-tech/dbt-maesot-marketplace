import { createClient } from '@supabase/supabase-js'

// Hardcode credentials สำหรับ GitHub Pages (ไม่มี env variables)
const supabaseUrl = 'https://alhwuoozlzmrgttupctt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaHd1b296bHptcmd0dHVwY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODE1NTAsImV4cCI6MjA5Nzk1NzU1MH0.yREDfkgbFgnVtqAYu0LAWCeRmFCSRoU2HtpjHtKqH4M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * ดึงข้อมูล user จากตาราง profiles
 * Schema: id(bigserial PK), student_id(text UNIQUE), full_name, department, role, created_at
 * student_id ถูก derive จาก auth email: {student_id}@gmail.com
 */
export const getUserProfile = async () => {
  let studentId = null
  let userEmail = null

  // 1. Try Supabase Auth session
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      studentId = user.email.split('@')[0]
      userEmail = user.email
    }
  } catch (_) {}

  // 2. Fallback to localStorage session
  if (!studentId) {
    try {
      const raw = localStorage.getItem('dbt_marketplace_session')
      if (raw) {
        const parsed = JSON.parse(raw)
        studentId = parsed.student_id || parsed.user?.id || parsed.user?.email?.split('@')[0]
        userEmail = parsed.user?.email
      }
    } catch (_) {}
  }

  if (!studentId) {
    return { data: null, error: new Error('ไม่พบ session การเข้าสู่ระบบ') }
  }

  const isAdmin = Boolean(studentId.toLowerCase().includes('admin') || userEmail?.toLowerCase().includes('admin'))

  // ดึงข้อมูลจากตาราง profiles
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  // ถ้าไม่มี profile ให้สร้างอัตโนมัติในตาราง profiles
  if (!error && !data) {
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert({ 
        student_id: studentId, 
        full_name: isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'นักศึกษา', 
        department: 'เทคโนโลยีธุรกิจดิจิทัล', 
        role: isAdmin ? 'admin' : 'student' 
      })
      .select()
      .maybeSingle()
    return { data: newProfile, error: insertError }
  }

  if (data && isAdmin && data.role !== 'admin') {
    data.role = 'admin'
    try {
      await supabase.from('profiles').update({ role: 'admin' }).eq('student_id', studentId)
    } catch (_) {}
  }

  return { data, error }
}
