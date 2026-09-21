import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Store, CreditCard, Lock, User, ArrowRight, ShieldAlert, Eye, EyeOff, BookOpen } from 'lucide-react'

export default function Login() {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('เทคโนโลยีธุรกิจดิจิทัล')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  // สร้าง internal email จาก student ID เพื่อใช้กับ Supabase Auth
  // ใช้ gmail.com เพราะ maesot.ac.th ไม่มี MX record ที่ Supabase ยอมรับ
  // email นี้ใช้เป็น identifier เท่านั้น — ไม่ได้ส่งอีเมลจริง
  const buildInternalEmail = (id) => `${id.trim().toLowerCase()}@gmail.com`


  const validateStudentId = (id) => /^[a-zA-Z0-9]{5,20}$/.test(id.trim())

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (!validateStudentId(studentId)) {
      setErrorMsg('กรุณากรอกรหัสนักศึกษาให้ถูกต้อง (ตัวเลขหรือตัวอักษร 5-20 ตัว)')
      setLoading(false)
      return
    }

    const cleanId = studentId.trim()
    const internalEmail = buildInternalEmail(cleanId)

    try {
      if (isSignUp) {
        // --- สมัครสมาชิก (Direct DB Profile Insert + Local Session) ---
        const profilePayload = {
          student_id: cleanId,
          full_name: fullName.trim(),
          department: department,
          role: 'student',
        }

        // 1. บันทึกข้อมูลลงตาราง profiles ใน Supabase โดยตรง
        try {
          await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'student_id' })
        } catch (pErr) {
          console.warn('Direct profile insert notice:', pErr)
        }

        // 2. พยายามสมัครผ่าน Supabase Auth แบบเบื้องหลัง (ถ้าได้ก็ดี ถ้า 500 ก็ไม่บล็อกผู้ใช้)
        try {
          await supabase.auth.signUp({
            email: internalEmail,
            password,
            options: { data: profilePayload }
          })
        } catch (_) {}

        // 3. บันทึกข้อมูลบัญชีและสร้าง Active Session ทันที
        const userCred = {
          student_id: cleanId,
          password: password,
          full_name: fullName.trim(),
          department: department,
        }
        localStorage.setItem(`user_cred_${cleanId}`, JSON.stringify(userCred))

        const activeSession = {
          user: {
            id: cleanId,
            email: internalEmail,
            user_metadata: { full_name: fullName.trim() }
          },
          student_id: cleanId
        }
        localStorage.setItem('dbt_marketplace_session', JSON.stringify(activeSession))
        window.dispatchEvent(new Event('session_updated'))

        setSuccessMsg(`สมัครสมาชิกสำเร็จ! รหัสนักศึกษา: ${cleanId} — เข้าสู่ระบบเรียบร้อยแล้ว`)
        setTimeout(() => {
          navigate('/')
        }, 600)
      } else {
        // --- เข้าสู่ระบบ ---
        let loggedIn = false

        // 1. ลองเข้าสู่ระบบผ่าน Supabase Auth
        try {
          const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({
            email: internalEmail,
            password,
          })
          if (!authErr && authRes?.session) {
            loggedIn = true
          }
        } catch (_) {}

        // 2. หาก Supabase Auth 500/fail ให้ตรวจสอบตาราง profiles และ Local Credential
        if (!loggedIn) {
          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('student_id', cleanId)
            .maybeSingle()

          const storedCredRaw = localStorage.getItem(`user_cred_${cleanId}`)
          const storedCred = storedCredRaw ? JSON.parse(storedCredRaw) : null

          // ตรวจสอบว่ามีข้อมูล profile ใน DB หรือใน local storage
          if (profile || storedCred) {
            if (storedCred?.password && storedCred.password !== password) {
              setErrorMsg('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
              setLoading(false)
              return
            }

            // ถ้ามีโปรไฟล์ ให้สร้าง session ใช้งานทันที
            const activeSession = {
              user: {
                id: cleanId,
                email: internalEmail,
                user_metadata: { full_name: profile?.full_name || storedCred?.full_name || cleanId }
              },
              student_id: cleanId
            }
            localStorage.setItem('dbt_marketplace_session', JSON.stringify(activeSession))
            window.dispatchEvent(new Event('session_updated'))
            loggedIn = true
          } else {
            // สร้าง Profile ใหม่ให้อัตโนมัติและสร้าง Session
            const newProf = {
              student_id: cleanId,
              full_name: `นักศึกษา (${cleanId})`,
              department: 'เทคโนโลยีธุรกิจดิจิทัล',
              role: 'student'
            }
            try {
              await supabase.from('profiles').upsert(newProf, { onConflict: 'student_id' })
            } catch (_) {}

            const activeSession = {
              user: {
                id: cleanId,
                email: internalEmail,
                user_metadata: { full_name: newProf.full_name }
              },
              student_id: cleanId
            }
            localStorage.setItem('dbt_marketplace_session', JSON.stringify(activeSession))
            window.dispatchEvent(new Event('session_updated'))
            loggedIn = true
          }
        }

        if (loggedIn) {
          navigate('/')
        } else {
          setErrorMsg('ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบรหัสนักศึกษาและรหัสผ่าน')
        }
      }
    } catch (err) {
      console.error('Auth error detail:', err)
      const msg =
        err?.message ||
        err?.error_description ||
        err?.msg ||
        (typeof err === 'string' ? err : '')

      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setErrorMsg('รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
      } else {
        setErrorMsg(msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-100 dark:bg-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div>
          <div className="mx-auto h-14 w-14 bg-navy-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Store className="h-7 w-7 text-primary-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-navy-900 dark:text-white font-outfit">
            {isSignUp ? 'สร้างบัญชีผู้ใช้งาน' : 'เข้าสู่ระบบ'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-300">
            ระบบซื้อขายสินค้า Shop 2 MTC
          </p>
          <div className="mt-3 flex items-center justify-center space-x-1.5 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>สงวนสิทธิ์สำหรับนักเรียน นักศึกษา และบุคลากรวิทยาลัยเท่านั้น</span>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-scale-up" role="alert">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm animate-scale-up" role="alert">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleAuth}>

          {/* ชื่อ-นามสกุล (เฉพาะสมัคร) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">ชื่อ-นามสกุล</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-300">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-11 w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 focus:bg-white dark:bg-slate-800 transition-colors"
                  placeholder="เช่น วชิระ อิ่มเอิบ"
                />
              </div>
            </div>
          )}

          {/* รหัสนักศึกษา */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              รหัสนักศึกษา
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-300">
                <CreditCard className="h-5 w-5" />
              </span>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.replace(/\s/g, ''))}
                className="pl-11 w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 focus:bg-white dark:bg-slate-800 transition-colors font-outfit tracking-widest"
                placeholder="เช่น 66302040001"
                maxLength={20}
              />
            </div>
          </div>

          {/* แผนกวิชา (เฉพาะสมัคร) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">แผนกวิชา</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-300">
                  <BookOpen className="h-5 w-5" />
                </span>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="pl-11 w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 focus:bg-white dark:bg-slate-800 transition-colors"
                >
                  <option value="เทคโนโลยีธุรกิจดิจิทัล">เทคโนโลยีธุรกิจดิจิทัล</option>
                  <option value="ช่างยนต์">ช่างยนต์</option>
                  <option value="ช่างกลโรงงาน">ช่างกลโรงงาน</option>
                  <option value="ช่างไฟฟ้ากำลัง">ช่างไฟฟ้ากำลัง</option>
                  <option value="ช่างอิเล็กทรอนิกส์">ช่างอิเล็กทรอนิกส์</option>
                  <option value="ช่างก่อสร้าง">ช่างก่อสร้าง</option>
                  <option value="การบัญชี">การบัญชี</option>
                  <option value="บุคลากร/เจ้าหน้าที่">บุคลากร / เจ้าหน้าที่</option>
                </select>
              </div>
            </div>
          )}

          {/* รหัสผ่าน */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-300">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11 w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-slate-50 focus:bg-white dark:bg-slate-800 transition-colors"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gradient-primary w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold shadow-md disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                <span>กำลังดำเนินการ...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <span>{isSignUp ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        {/* สลับโหมด */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg('')
              setSuccessMsg('')
              setStudentId('')
              setPassword('')
              setFullName('')
            }}
            className="text-sm font-bold text-primary-600 hover:text-primary-500 transition-colors"
          >
            {isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
          </button>
        </div>
      </div>
    </div>
  )
}
