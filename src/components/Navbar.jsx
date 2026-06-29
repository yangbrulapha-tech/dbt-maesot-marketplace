import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ShoppingBag, User, AlertOctagon, Store, MessageSquare, ShieldCheck, Truck } from 'lucide-react'
import { supabase, getUserProfile } from '../supabaseClient'

export default function Navbar({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [userProfile, setUserProfile] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isRiderActive, setIsRiderActive] = useState(false)

  useEffect(() => {
    if (session) {
      fetchRoleAndRider()
    } else {
      setUserProfile(null)
      setUserRole(null)
      setIsRiderActive(false)
    }
  }, [session])

  const fetchRoleAndRider = async () => {
    try {
      const { data } = await getUserProfile()
      if (data) {
        setUserProfile(data)
        setUserRole(data.role)
        
        // ตรวจสอบสถานะการอนุมัติเป็น Rider จากตาราง riders
        const { data: rider } = await supabase
          .from('riders')
          .select('is_active')
          .eq('student_id', data.student_id)
          .maybeSingle()
        
        if (rider) {
          setIsRiderActive(rider.is_active)
        }
      }
    } catch (_) {
      // ignore
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/', label: 'สินค้าทั้งหมด', icon: Store },
    { path: '/chat', label: 'ข้อความ', icon: MessageSquare, requireAuth: true },
    { path: '/profile', label: 'โปรไฟล์', icon: User, requireAuth: true },
    { path: '/orders', label: 'คำสั่งซื้อ', icon: ShoppingBag, requireAuth: true },
    { path: '/reports', label: 'รายงาน', icon: AlertOctagon, requireAuth: true },
    // Rider-only item (แสดงเมื่อไรเดอร์ได้รับอนุมัติแล้ว)
    { path: '/rider', label: 'Rider', icon: Truck, requireAuth: true, riderOnly: true },
    // Admin-only item
    { path: '/admin', label: 'Admin', icon: ShieldCheck, requireAuth: true, adminOnly: true },
  ]


  const visibleItems = navItems.filter((item) => {
    if (!item.requireAuth) return true
    if (!session) return false
    if (item.adminOnly && userRole !== 'admin') return false
    if (item.riderOnly && !isRiderActive) return false
    return true
  })

  return (
    <nav className="bg-navy-900 text-white border-b border-navy-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            {/* Institution Logos on the far left */}
            <div className="flex items-center -space-x-3.5 shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-navy-900 bg-white shrink-0 shadow-md relative z-20">
                <img src={`${import.meta.env.BASE_URL}college_logo.png`} alt="MTC Logo" className="w-full h-full object-cover" />
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-navy-900 bg-navy-950 shrink-0 shadow-md relative z-10">
                <img src={`${import.meta.env.BASE_URL}dbt_logo.jpg`} alt="DBT Logo" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Vertical Divider line */}
            <div className="h-10 w-px bg-navy-800 shrink-0" />

            {/* Main store logo link */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-gradient-to-tr from-primary-600 to-sky-500 rounded-xl text-white shadow-md shadow-sky-500/10 group-hover:scale-105 transition-all duration-300">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-wider block leading-tight font-outfit transition-colors">
                  <span className="text-white group-hover:text-slate-100 transition-colors">DBT </span>
                  <span className="text-sky-400 group-hover:text-sky-300 transition-colors">MAE SOT</span>
                </span>
                <span className="text-[9px] text-sky-200/60 block font-medium tracking-wider leading-none mt-0.5">
                  เทคโนโลยีธุรกิจดิจิทัล
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isAdminItem = item.adminOnly
              const isRiderItem = item.riderOnly
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? isAdminItem
                        ? 'bg-red-600 text-white shadow-md'
                        : isRiderItem
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-primary-600 text-white shadow-md'
                      : isAdminItem
                        ? 'text-red-300 hover:bg-red-900/30 hover:text-red-200'
                        : isRiderItem
                          ? 'text-emerald-300 hover:bg-emerald-900/30 hover:text-emerald-200'
                          : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>


          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-3">
                 <span className="hidden lg:inline text-xs text-sky-200/90 border-r border-navy-700 pr-3 font-semibold truncate max-w-[180px]" title={userProfile?.full_name || session.user.email}>
                  👤 {userProfile?.full_name || session.user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all duration-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 bg-primary-600 hover:bg-primary-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold shadow-md transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {session && (
        <div className="md:hidden bg-navy-950 border-t border-navy-800 flex justify-around py-2">
          {visibleItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-1.5 rounded-md text-[10px] font-medium transition-colors ${
                  isActive(item.path)
                    ? item.adminOnly
                      ? 'text-red-400'
                      : item.riderOnly
                        ? 'text-emerald-400'
                        : 'text-primary-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}

