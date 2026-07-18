import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ShoppingBag, User, AlertOctagon, Store, MessageSquare, ShieldCheck, Truck, Moon, Sun } from 'lucide-react'
import { supabase, getUserProfile } from '../supabaseClient'
import NotificationBell from './NotificationBell'
import useDarkMode from '../hooks/useDarkMode'

export default function Navbar({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [userProfile, setUserProfile] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isRiderActive, setIsRiderActive] = useState(false)
  
  const [menuBadges, setMenuBadges] = useState({
    '/chat': 0,
    '/orders': 0,
    '/rider': 0,
    '/admin': 0,
  })

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDark, toggleDarkMode] = useDarkMode()

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

  useEffect(() => {
    if (session && userProfile) {
      fetchMenuBadges()
      const interval = setInterval(fetchMenuBadges, 30000)
      return () => clearInterval(interval)
    }
  }, [session, userProfile, isRiderActive, userRole])

  const fetchMenuBadges = async () => {
    try {
      const badges = { '/chat': 0, '/orders': 0, '/rider': 0, '/admin': 0 }

      const { count: chatCount } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userProfile.student_id)
        .eq('is_read', false)
      if (chatCount) badges['/chat'] = chatCount

      const { count: orderCount } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.student_id)
        .eq('link', '/orders')
        .eq('is_read', false)
      if (orderCount) badges['/orders'] = orderCount

      if (isRiderActive) {
        const { count: riderCount } = await supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('needs_delivery', true)
          .is('rider_id', null)
          .eq('status', 'pending')
        if (riderCount) badges['/rider'] = riderCount
      }

      if (userRole === 'admin') {
        const { count: adminCount } = await supabase.from('refund_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        if (adminCount) badges['/admin'] = adminCount
      }

      setMenuBadges(badges)
    } catch (err) {
      console.error(err)
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
    <nav className="bg-navy-900 dark:bg-slate-950 text-white border-b border-navy-800 dark:border-slate-900 sticky top-0 z-50 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            {/* Institution Logos on the far left */}
            <div className="flex items-center -space-x-3.5 shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-navy-900 dark:border-slate-950 bg-white shrink-0 shadow-md relative z-20">
                <img src={`${import.meta.env.BASE_URL}college_logo.png`} alt="MTC Logo" className="w-full h-full object-cover" />
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-navy-900 dark:border-slate-950 bg-navy-950 dark:bg-slate-900 shrink-0 shadow-md relative z-10">
                <img src={`${import.meta.env.BASE_URL}dbt_logo.jpg`} alt="DBT Logo" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Vertical Divider line */}
            <div className="h-10 w-px bg-navy-800 dark:bg-slate-800 shrink-0" />

            {/* Main store logo link */}
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
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
          <div className="hidden xl:flex items-center space-x-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isAdminItem = item.adminOnly
              const isRiderItem = item.riderOnly
              const badgeCount = menuBadges[item.path] || 0
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive(item.path)
                      ? isAdminItem
                        ? 'bg-red-600 text-white shadow-md'
                        : isRiderItem
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-primary-600 text-white shadow-md'
                      : isAdminItem
                        ? 'text-red-300 hover:bg-red-900/30 dark:hover:bg-red-900/40 hover:text-red-200'
                        : isRiderItem
                          ? 'text-emerald-300 hover:bg-emerald-900/30 dark:hover:bg-emerald-900/40 hover:text-emerald-200'
                          : 'text-slate-300 hover:bg-navy-800 dark:hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full shadow-sm ml-1">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>


          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <button onClick={toggleDarkMode} className="p-2 text-slate-300 hover:text-white transition-colors" title="สลับโหมดหน้าจอ">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {session ? (
              <div className="flex items-center space-x-3">
                <NotificationBell session={session} />
                <div className="hidden lg:flex items-center space-x-2 text-sky-200/90 border-r border-navy-700 dark:border-slate-800 pr-3 pl-1" title={userProfile?.full_name || session.user.email}>
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url.startsWith('http') ? userProfile.avatar_url : `${import.meta.env.BASE_URL}${userProfile.avatar_url.startsWith('/') ? userProfile.avatar_url.slice(1) : userProfile.avatar_url}`}
                      alt="profile" 
                      className="w-6 h-6 rounded-full object-cover ring-2 ring-primary-500/50 shrink-0"
                    />
                  ) : (
                    <User className="h-5 w-5 text-sky-300 shrink-0" />
                  )}
                  <span className="text-xs font-semibold truncate max-w-[150px]">
                    {userProfile?.full_name || session.user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all duration-200 whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 bg-primary-600 hover:bg-primary-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold shadow-md transition-all duration-200 whitespace-nowrap shrink-0"
              >
                <User className="h-4 w-4 shrink-0" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {session && (
        <div className="xl:hidden bg-navy-950 dark:bg-slate-950 border-t border-navy-800 dark:border-slate-900 flex justify-around py-2 transition-colors">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const badgeCount = menuBadges[item.path] || 0
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
                <div className="relative">
                  <Icon className="h-5 w-5 mb-0.5 mx-auto" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-2 inline-flex items-center justify-center bg-red-500 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full shadow-sm">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}

