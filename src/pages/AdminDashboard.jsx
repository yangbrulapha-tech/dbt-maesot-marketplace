import React, { useState, useEffect, useCallback } from 'react'
import { supabase, getUserProfile } from '../supabaseClient'
import { ShieldCheck, Trash2, Loader2, Package, Users, ShoppingBag, AlertCircle, CheckCircle2, X, RefreshCw, Search, Truck } from 'lucide-react'
import { Navigate } from 'react-router-dom'

// Schema จริง:
// users: student_id(PK), full_name, email, role, created_at
// products: product_id(PK), seller_id(student_id), title, price, category, status, created_at
// orders: order_id(PK), product_id, buyer_id(student_id), rider_id, status, created_at
// riders: student_id(PK), vehicle_type, license_plate, is_active(boolean), rating(numeric)

function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start space-x-3 p-4 rounded-xl shadow-lg border animate-scale-up ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {t.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)}><X className="h-4 w-4 opacity-50 hover:opacity-100" /></button>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard({ session }) {
  const [userProfile, setUserProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [riders, setRiders] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('products')
  
  // Loading states
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [riderActionLoading, setRiderActionLoading] = useState(null)

  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])
  const removeToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  useEffect(() => {
    if (session) checkAdminAndLoad()
  }, [session])

  const checkAdminAndLoad = async () => {
    setAuthLoading(true)
    try {
      const { data: profile, error } = await getUserProfile()
      if (error) throw error
      setUserProfile(profile)
      if (profile?.role === 'admin') {
        setIsAdmin(true)
        await loadAllData()
      } else {
        setIsAdmin(false)
      }
    } catch (err) {
      addToast('ไม่สามารถตรวจสอบสิทธิ์: ' + (err.message || ''), 'error')
    } finally {
      setAuthLoading(false)
    }
  }

  const loadAllData = async () => {
    setDataLoading(true)
    try {
      const [pRes, uRes, oRes, rRes] = await Promise.all([
        supabase.from('products').select('product_id, seller_id, title, price, category, status, created_at').order('created_at', { ascending: false }),
        supabase.from('users').select('student_id, full_name, email, role, created_at').order('created_at', { ascending: false }),
        supabase.from('orders').select(`order_id, buyer_id, status, created_at, product:products(title, price)`).order('created_at', { ascending: false }).limit(50),
        supabase.from('riders').select('*').order('is_active', { ascending: true })
      ])
      
      if (pRes.error) throw pRes.error
      if (uRes.error) throw uRes.error
      
      const usersData = uRes.data || []
      const rawRiders = rRes.data || []

      // แมปรายชื่อผู้ใช้งานให้กับข้อมูลไรเดอร์ (เพื่อแสดงชื่อ-นามสกุลจริง)
      const mappedRiders = rawRiders.map(rider => {
        const u = usersData.find(usr => usr.student_id === rider.student_id)
        return {
          ...rider,
          full_name: u?.full_name || 'ไม่พบบัญชีผู้ใช้',
          email: u?.email || ''
        }
      })

      setProducts(pRes.data || [])
      setUsers(usersData)
      setOrders(oRes.data || [])
      setRiders(mappedRiders)
    } catch (err) {
      addToast('เกิดข้อผิดพลาด: ' + (err.message || ''), 'error')
    } finally {
      setDataLoading(false)
    }
  }

  // Admin delete สินค้า
  const handleDeleteProduct = async (productId, productTitle) => {
    if (!window.confirm(`⚠️ Admin: ยืนยันลบ "${productTitle}"?`)) return
    setDeleteLoading(productId)
    try {
      const { error } = await supabase.from('products').delete().eq('product_id', productId)
      if (error) throw error
      setProducts((prev) => prev.filter((p) => p.product_id !== productId))
      addToast(`ลบ "${productTitle}" เรียบร้อย`, 'success')
    } catch (err) {
      addToast('ลบไม่ได้: ' + err.message, 'error')
    } finally {
      setDeleteLoading(null)
    }
  }

  // อนุมัติการสมัครเป็น Rider
  const handleApproveRider = async (studentId, fullName) => {
    setRiderActionLoading(studentId)
    try {
      const { error } = await supabase
        .from('riders')
        .update({ is_active: true })
        .eq('student_id', studentId)
      
      if (error) throw error
      
      addToast(`อนุมัติให้คุณ "${fullName}" เป็น Rider เรียบร้อย`, 'success')
      await loadAllData()
    } catch (err) {
      addToast('ไม่สามารถอนุมัติได้: ' + err.message, 'error')
    } finally {
      setRiderActionLoading(null)
    }
  }

  // ระงับสิทธิ์ Rider
  const handleSuspendRider = async (studentId, fullName) => {
    if (!window.confirm(`ระงับสิทธิ์การให้บริการ Rider ของคุณ "${fullName}" ใช่หรือไม่?`)) return
    setRiderActionLoading(studentId)
    try {
      const { error } = await supabase
        .from('riders')
        .update({ is_active: false })
        .eq('student_id', studentId)
      
      if (error) throw error
      
      addToast(`ระงับสิทธิ์ Rider "${fullName}" เรียบร้อย`, 'success')
      await loadAllData()
    } catch (err) {
      addToast('ไม่สามารถดำเนินการได้: ' + err.message, 'error')
    } finally {
      setRiderActionLoading(null)
    }
  }

  // ลบใบสมัคร/ข้อมูล Rider ออกถาวร
  const handleDeleteRider = async (studentId, fullName) => {
    if (!window.confirm(`ลบข้อมูลใบสมัคร Rider ของคุณ "${fullName}" ถาวรใช่หรือไม่? (ผู้ใช้จะสามารถกดสมัครใหม่ได้)`)) return
    setRiderActionLoading(studentId)
    try {
      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('student_id', studentId)
      
      if (error) throw error
      
      addToast(`ลบข้อมูล Rider "${fullName}" สำเร็จ`, 'success')
      await loadAllData()
    } catch (err) {
      addToast('ไม่สามารถลบข้อมูลได้: ' + err.message, 'error')
    } finally {
      setRiderActionLoading(null)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.seller_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredRiders = riders.filter((r) =>
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (r) => ({ admin: 'bg-red-100 text-red-700 border-red-200', teacher: 'bg-purple-100 text-purple-700 border-purple-200', staff: 'bg-amber-100 text-amber-700 border-amber-200' }[r] || 'bg-sky-100 text-sky-700 border-sky-200')
  const getRoleLabel = (r) => ({ admin: 'Admin', teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', student: 'นักศึกษา' }[r] || 'นักศึกษา')
  const getVehicleLabel = (val) => ({ walking: 'เดินเท้า', bicycle: 'จักรยาน', motorcycle: 'รถมอเตอร์ไซค์' }[val] || 'เดินเท้า')

  if (!session) return <Navigate to="/login" replace />
  if (authLoading) return (
    <div className="flex flex-col justify-center items-center py-24 space-y-4">
      <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
      <p className="text-slate-500 text-sm">กำลังตรวจสอบสิทธิ์ Admin...</p>
    </div>
  )
  if (!isAdmin) return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <ShieldCheck className="mx-auto h-16 w-16 text-red-300 mb-4" />
      <h1 className="text-2xl font-extrabold text-navy-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
      <p className="text-slate-500">หน้านี้สำหรับ Admin เท่านั้น — บทบาทปัจจุบัน: <span className="font-bold">{getRoleLabel(userProfile?.role)}</span></p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-1 bg-red-100 border border-red-200 rounded-full text-xs font-extrabold text-red-700 uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">แดชบอร์ดผู้ดูแลระบบ</h1>
          <p className="mt-1 text-slate-500">จัดการสินค้า ผู้ใช้งาน ไรเดอร์ และออเดอร์ทั้งหมด</p>
        </div>
        <button onClick={loadAllData} disabled={dataLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} /><span>รีเฟรช</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'สินค้าทั้งหมด', value: products.length, icon: Package, color: 'bg-primary-50 border-primary-200 text-primary-700', iColor: 'text-primary-500' },
          { label: 'ผู้ใช้งานทั้งหมด', value: users.length, icon: Users, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', iColor: 'text-indigo-500' },
          { label: 'ออเดอร์ทั้งหมด', value: orders.length, icon: ShoppingBag, color: 'bg-amber-50 border-amber-200 text-amber-700', iColor: 'text-amber-500' },
          { label: 'ไรเดอร์สมัครแล้ว', value: riders.length, icon: Truck, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', iColor: 'text-emerald-500' }
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`p-5 rounded-2xl border ${s.color} flex items-center space-x-3 shadow-sm bg-white`}>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-sm border ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div><p className="text-2xl font-black">{s.value}</p><p className="text-xs font-bold opacity-70">{s.label}</p></div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 mb-6 shadow-sm">
        {[
          { key: 'products', label: 'สินค้า', icon: Package },
          { key: 'users', label: 'ผู้ใช้งาน', icon: Users },
          { key: 'riders', label: 'อนุมัติ Rider', icon: Truck },
          { key: 'orders', label: 'ออเดอร์', icon: ShoppingBag }
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === key ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Icon className="h-4 w-4" /><span>{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="ค้นหา..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm" />
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 text-primary-600 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'products' && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['สินค้า (title)', 'ผู้ขาย (student_id)', 'ราคา', 'หมวดหมู่', 'สถานะ', 'จัดการ'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">ไม่พบสินค้า</td></tr>
                  ) : filteredProducts.map((p) => (
                    <tr key={p.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4"><span className="font-bold text-navy-900 line-clamp-1">{p.title}</span></td>
                      <td className="px-5 py-4"><span className="text-xs font-mono text-slate-600">{p.seller_id}</span></td>
                      <td className="px-5 py-4"><span className="font-black text-navy-900 font-outfit">฿{Number(p.price).toLocaleString()}</span></td>
                      <td className="px-5 py-4"><span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{p.category}</span></td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>{p.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleDeleteProduct(p.product_id, p.title)} disabled={deleteLoading === p.product_id}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold disabled:opacity-50">
                          {deleteLoading === p.product_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          <span>ลบ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'users' && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ชื่อ', 'รหัสนักศึกษา (PK)', 'อีเมล', 'บทบาท'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400">ไม่พบผู้ใช้</td></tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-navy-900 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(u.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-navy-900">{u.full_name || 'ไม่ระบุ'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-xs font-mono text-slate-600">{u.student_id}</span></td>
                      <td className="px-5 py-4"><span className="text-xs text-slate-600">{u.email}</span></td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadge(u.role)}`}>{getRoleLabel(u.role)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'riders' && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ชื่อผู้ให้บริการ', 'รหัสนักศึกษา', 'ประเภทรถ', 'ป้ายทะเบียน', 'สถานะ', 'จัดการ'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRiders.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">ไม่พบข้อมูลผู้สมัคร Rider</td></tr>
                  ) : filteredRiders.map((r) => (
                    <tr key={r.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-emerald-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(r.full_name || 'R').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-navy-900">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-xs font-mono text-slate-600">{r.student_id}</span></td>
                      <td className="px-5 py-4"><span className="text-xs font-semibold text-slate-700">{getVehicleLabel(r.vehicle_type)}</span></td>
                      <td className="px-5 py-4"><span className="text-xs font-mono font-bold text-slate-600">{r.license_plate || '-'}</span></td>
                      <td className="px-5 py-4">
                        {r.is_active ? (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">อนุมัติแล้ว</span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold animate-pulse">รออนุมัติ</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {r.is_active ? (
                            <button onClick={() => handleSuspendRider(r.student_id, r.full_name)} disabled={riderActionLoading === r.student_id}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold disabled:opacity-50">
                              ระงับสิทธิ์
                            </button>
                          ) : (
                            <button onClick={() => handleApproveRider(r.student_id, r.full_name)} disabled={riderActionLoading === r.student_id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold disabled:opacity-50">
                              อนุมัติสิทธิ์
                            </button>
                          )}
                          <button onClick={() => handleDeleteRider(r.student_id, r.full_name)} disabled={riderActionLoading === r.student_id}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg disabled:opacity-50" title="ลบข้อมูล">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'orders' && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ออเดอร์', 'สินค้า (title)', 'ผู้ซื้อ (student_id)', 'สถานะ'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400">ไม่มีออเดอร์</td></tr>
                  ) : orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4"><span className="font-mono font-bold text-navy-900 text-xs">#ORD-{o.order_id}</span></td>
                      <td className="px-5 py-4"><span className="font-medium text-slate-700 line-clamp-1">{o.product?.title || '-'}</span></td>
                      <td className="px-5 py-4"><span className="text-xs font-mono text-slate-600">{o.buyer_id}</span></td>
                      <td className="px-5 py-4">
                        {o.status === 'completed' && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">สำเร็จ</span>}
                        {o.status === 'cancelled' && <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">ยกเลิก</span>}
                        {o.status === 'pending' && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold animate-pulse">รอดำเนินการ</span>}
                        {o.status === 'shipping' && <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold animate-pulse">กำลังจัดส่ง</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
