import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

/**
 * ดึงข้อมูล user จากตาราง users
 * Schema จริง: student_id (PK, varchar), full_name, email, role, created_at
 * student_id ถูก derive จาก auth email: {student_id}@gmail.com
 */
export const getUserProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: authError || new Error('ไม่พบ session การเข้าสู่ระบบ') }
  }

  // extract student_id จาก internal email: {student_id}@gmail.com
  const studentId = user.email?.split('@')[0]
  if (!studentId) {
    return { data: null, error: new Error('ไม่สามารถระบุรหัสนักศึกษาได้จาก email') }
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('student_id', studentId)
    .single()

  return { data, error }
}
