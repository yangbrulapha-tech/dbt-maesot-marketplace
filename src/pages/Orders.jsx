import React, { useState, useEffect } from 'react'
import { supabase, getUserProfile } from '../supabaseClient'
import { ShoppingBag, CheckCircle2, XCircle, Clock, Loader2, MessageSquare, AlertCircle, Send, X, ShieldAlert, ImagePlus, MapPin } from 'lucide-react'

// Schema จริง:
// orders: order_id(PK), product_id, buyer_id(student_id varchar), rider_id, status, created_at
// products: product_id, seller_id(student_id), title, price, image_url
// users: student_id(PK), full_name, email, role

export default function Orders({ session }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('buyer')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false)
  const [messageTarget, setMessageTarget] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [refundOrderId, setRefundOrderId] = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundEvidence, setRefundEvidence] = useState('')
  const [refundLoading, setRefundLoading] = useState(false)

  useEffect(() => {
    if (session) fetchProfileAndOrders()
  }, [session])

  const fetchProfileAndOrders = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: profile, error: profileError } = await getUserProfile()
      if (profileError) throw profileError
      setUserProfile(profile)

      // orders join products (title, price, image_url, seller_id)
      // แล้ว join seller user และ buyer user จาก student_id
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products (
            product_id,
            title,
            price,
            image_url,
            seller_id
          ),
          buyer:users!orders_buyer_id_fkey (
            student_id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // ดึงข้อมูล seller แยก (เพราะ seller_id อยู่ใน products ไม่ใช่ orders)
      const ordersWithSeller = await Promise.all(
        (data || []).map(async (order) => {
          // หากมี rider_id ให้ดึงข้อมูล rider เพิ่มด้วย
          let riderData = null
          if (order.rider_id) {
            const { data: r } = await supabase
              .from('users')
              .select('student_id, full_name')
              .eq('student_id', order.rider_id)
              .maybeSingle()
            riderData = r
          }

          if (order.product?.seller_id) {
            const { data: sellerData } = await supabase
              .from('users')
              .select('student_id, full_name, email')
              .eq('student_id', order.product.seller_id)
              .single()
            return { ...order, seller: sellerData, rider: riderData }
          }
          return { ...order, seller: null, rider: riderData }
        })
      )

      setOrders(ordersWithSeller)
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาด: ' + (err.message || JSON.stringify(err)))
    } finally {
      setLoading(false)
    }
  }

  // Seller update order status — seller_id อยู่ใน products ไม่ใช่ orders
  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId)
    setErrorMsg('')
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('order_id', orderId)
      if (error) throw error
      await fetchProfileAndOrders()
      setSuccessMsg(`อัปเดตสถานะออเดอร์ #ORD-${orderId} เรียบร้อย`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg('ไม่สามารถอัปเดตสถานะได้: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ผู้ซื้อขอย้อนหลังเรียกใช้ Rider
  const handleRequestRiderLater = async (orderId) => {
    setActionLoading(orderId)
    setErrorMsg('')
    try {
      const { error } = await supabase
        .from('orders')
        .update({ needs_delivery: true })
        .eq('order_id', orderId)
      if (error) throw error
      await fetchProfileAndOrders()
      setSuccessMsg(`ส่งคำขอใช้บริการ Rider สำหรับออเดอร์ #ORD-${orderId} สำเร็จ!`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg('ไม่สามารถเรียกไรเดอร์ได้: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }


  const openMessageModal = (order) => {
    const isBuyer = activeTab === 'buyer'
    const partner = isBuyer ? order.seller : order.buyer
    setMessageTarget({
      partnerName: partner?.full_name || partner?.student_id || 'ผู้ใช้',
      partnerId: partner?.student_id,
      productId: order.product?.product_id,
      productTitle: order.product?.title || 'สินค้า',
    })
    setMessageText(`สวัสดีครับ สอบถามเรื่องออเดอร์สินค้า "${order.product?.title}" ครับ`)
    setIsMsgModalOpen(true)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim() || !messageTarget) return
    setMsgLoading(true)
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: userProfile.student_id,
        receiver_id: messageTarget.partnerId,
        product_id: messageTarget.productId,
        content: messageText,
        is_read: false,
      })
      if (error) throw error
      
      // Add Notification
      await supabase.from('notifications').insert({
        user_id: messageTarget.partnerId,
        title: 'ข้อความใหม่',
        message: `มีข้อความใหม่จาก ${userProfile.full_name}`,
        link: '/chat'
      })

      setSuccessMsg(`ส่งข้อความหา ${messageTarget.partnerName} เรียบร้อย!`)
      setIsMsgModalOpen(false)
      setMessageText('')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg('ไม่สามารถส่งข้อความได้: ' + err.message)
    } finally {
      setMsgLoading(false)
    }
  }

  const openRefundModal = (orderId) => {
    setRefundOrderId(orderId)
    setRefundReason('')
    setRefundEvidence('')
    setIsRefundModalOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setRefundEvidence(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRefundSubmit = async (e) => {
    e.preventDefault()
    if (!refundReason) return setErrorMsg('กรุณาระบุเหตุผลการขอคืนเงิน')
    setRefundLoading(true)
    try {
      const { error } = await supabase.from('refund_requests').insert({
        order_id: refundOrderId,
        buyer_id: userProfile.student_id,
        reason: refundReason,
        evidence_url: refundEvidence,
        status: 'pending'
      })
      if (error) throw error

      setSuccessMsg('ส่งคำขอคืนเงินเรียบร้อยแล้ว แอดมินจะตรวจสอบและแจ้งผลให้ทราบ')
      setIsRefundModalOpen(false)
      setRefundReason('')
      setRefundEvidence('')
      setRefundOrderId(null)
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการยื่นขอคืนเงิน: ' + err.message)
    } finally {
      setRefundLoading(false)
    }
  }

  // แยกออเดอร์ตาม buyer_id และ seller_id (seller อยู่ใน product.seller_id)
  const buyerOrders = orders.filter((o) => userProfile && o.buyer_id === userProfile.student_id)
  const sellerOrders = orders.filter((o) => userProfile && o.product?.seller_id === userProfile.student_id)
  const displayed = activeTab === 'buyer' ? buyerOrders : sellerOrders

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /><span>สำเร็จ</span></span>
    if (status === 'cancelled') return <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"><XCircle className="h-3.5 w-3.5" /><span>ยกเลิก</span></span>
    return <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"><Clock className="h-3.5 w-3.5" /><span>รอดำเนินการ</span></span>
  }

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 space-y-4">
      <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
      <p className="text-slate-500 dark:text-slate-300 text-sm">กำลังโหลดรายการสั่งซื้อ...</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy-900 dark:text-white tracking-tight">รายการสั่งซื้อของฉัน</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-300">ติดตามสถานะออเดอร์และการติดต่อผู้ซื้อผู้ขาย</p>
      </div>

      {successMsg && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2 animate-scale-up">
          <CheckCircle2 className="h-5 w-5 shrink-0" /><span className="font-bold text-sm">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center space-x-2 animate-scale-up">
          <AlertCircle className="h-5 w-5 shrink-0" /><span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 rounded-2xl mb-6">
        <button onClick={() => setActiveTab('buyer')}
          className={`flex-1 py-3 text-sm font-extrabold rounded-xl transition-all duration-200 ${activeTab === 'buyer' ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900/50'}`}>
          ฉันเป็นผู้ซื้อ ({buyerOrders.length})
        </button>
        <button onClick={() => setActiveTab('seller')}
          className={`flex-1 py-3 text-sm font-extrabold rounded-xl transition-all duration-200 ${activeTab === 'seller' ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900/50'}`}>
          ฉันเป็นผู้ขาย ({sellerOrders.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-20 px-4">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-navy-900 dark:text-white">ไม่มีรายการสั่งซื้อ</h3>
          <p className="text-slate-500 dark:text-slate-300 text-sm mt-1">{activeTab === 'buyer' ? 'คุณยังไม่มีประวัติการซื้อ' : 'ยังไม่มีออเดอร์สำหรับสินค้าของคุณ'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayed.map((order) => (
            <div key={order.order_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-300 font-bold uppercase tracking-wider block">ใบสั่งซื้อ</span>
                  <span className="text-sm font-extrabold text-navy-900 dark:text-white font-outfit">#ORD-{order.order_id}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] text-slate-500 dark:text-slate-300 hidden sm:block">
                    {new Date(order.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col lg:flex-row justify-between gap-6">
                {/* Product */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    <img src={order.product?.image_url} alt={order.product?.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200' }} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{order.product?.title || 'สินค้า (ถูกลบแล้ว)'}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">ผู้ขาย: <span className="font-bold">{order.seller?.full_name || order.product?.seller_id}</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">ผู้ซื้อ: <span className="font-bold">{order.buyer?.full_name || order.buyer_id}</span></p>
                    
                    {/* ข้อมูล Rider */}
                    <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
                      {order.needs_delivery ? (
                        order.rider_id ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🛵 Rider รับส่งแล้ว: {order.rider?.full_name || order.rider_id}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            🛵 รอกลุ่ม Rider กดรับงาน...
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          📦 นัดรับและจ่ายเงินทั่วไป
                        </span>
                      )}
                    </div>

                    <p className="text-base font-black text-navy-900 dark:text-white pt-1.5 font-outfit">
                      ฿{Number(order.product?.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>

                    {/* แสดงจุดส่งของ/นัดรับ */}
                    {order.delivery_location && (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">สถานที่นัดรับ / จัดส่ง:</span>
                          <span className="text-slate-600 dark:text-slate-300">{order.delivery_location}</span>
                        </div>
                      </div>
                    )}

                    {/* แสดงรูปภาพหลักฐานการจัดส่งของ Rider */}
                    {order.delivery_image_url && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider mb-1">📸 รูปหลักฐานการจัดส่งจาก Rider</span>
                        <a href={order.delivery_image_url} target="_blank" rel="noreferrer" className="inline-block h-16 w-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 hover:opacity-85 transition-opacity">
                          <img src={order.delivery_image_url} alt="delivery-proof" className="w-full h-full object-cover rounded-md" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>


                {/* Contact */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[220px]">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2.5">
                    <h4 className="text-[10px] font-extrabold text-navy-950 uppercase tracking-widest">
                      {activeTab === 'buyer' ? 'ติดต่อผู้ขาย' : 'ติดต่อผู้ซื้อ'}
                    </h4>
                    <button onClick={() => openMessageModal(order)}
                      className="inline-flex items-center space-x-1 bg-navy-900 hover:bg-navy-800 text-white px-2.5 py-1 rounded-lg text-[9px] font-extrabold shadow-sm">
                      <MessageSquare className="h-3 w-3" />
                      <span>ส่งข้อความ</span>
                    </button>
                  </div>
                  {activeTab === 'buyer' && (order.status === 'completed' || order.status === 'pending') && (
                    <button onClick={() => openRefundModal(order.order_id)}
                      className="mt-2 w-full flex items-center justify-center space-x-1 border border-red-500 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>ขอคืนเงิน (Refund)</span>
                    </button>
                  )}
                  {activeTab === 'buyer' ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{order.seller?.full_name || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300 font-mono">{order.product?.seller_id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{order.seller?.email || '-'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{order.buyer?.full_name || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300 font-mono">{order.buyer_id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{order.buyer?.email || '-'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller / Buyer Actions */}
              {(activeTab === 'seller' || activeTab === 'buyer') && (
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-t border-slate-100 flex justify-end space-x-3">
                  {/* ผู้ซื้อขอย้อนหลังเรียกไรเดอร์ภายหลัง */}
                  {activeTab === 'buyer' && order.status === 'pending' && !order.needs_delivery && (
                    <button onClick={() => handleRequestRiderLater(order.order_id)} disabled={actionLoading === order.order_id}
                      className="flex items-center space-x-1 px-4 py-2 border border-emerald-300 hover:bg-emerald-50 text-emerald-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                      <span>🛵 เรียกใช้บริการ Rider</span>
                    </button>
                  )}

                  {/* ผู้ขายจัดการออเดอร์ */}
                  {activeTab === 'seller' && order.status === 'pending' && (
                    <>
                      <button onClick={() => handleUpdateStatus(order.order_id, 'cancelled')} disabled={actionLoading === order.order_id}
                        className="px-4 py-2 border border-red-300 rounded-lg text-xs font-semibold text-red-700 bg-white dark:bg-slate-800 hover:bg-red-50 disabled:opacity-50">
                        ปฏิเสธ
                      </button>
                      <button onClick={() => handleUpdateStatus(order.order_id, 'completed')} disabled={actionLoading === order.order_id}
                        className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 disabled:opacity-50 shadow-sm">
                        {actionLoading === order.order_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" /><span>ยืนยันเสร็จสิ้น</span></>}
                      </button>
                    </>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Message Modal */}
      {isMsgModalOpen && messageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="bg-navy-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2"><MessageSquare className="h-5 w-5 text-primary-400" /><h2 className="text-lg font-bold">ส่งข้อความ</h2></div>
              <button onClick={() => setIsMsgModalOpen(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-300" /></button>
            </div>
            <form onSubmit={handleSendOrderMessage} className="p-6 space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border">
                ส่งถึง: <span className="font-bold text-navy-950">{messageTarget.partnerName}</span> เรื่อง "<span className="font-bold">{messageTarget.productTitle}</span>"
              </div>
              <textarea rows="4" required value={messageText} onChange={(e) => setMessageText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsMsgModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
                <button type="submit" disabled={msgLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-navy-900 text-white rounded-lg text-sm font-bold hover:bg-navy-800 disabled:opacity-50">
                  {msgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 text-primary-300" /><span>ส่ง</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2"><ShieldAlert className="h-5 w-5" /><h2 className="text-lg font-bold">ยื่นคำขอคืนเงิน</h2></div>
              <button onClick={() => setIsRefundModalOpen(false)}><X className="h-5 w-5 text-red-200 hover:text-white transition-colors" /></button>
            </div>
            <form onSubmit={handleRefundSubmit} className="p-6 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                คุณกำลังขอคืนเงินสำหรับออเดอร์ <span className="font-bold text-navy-950">#ORD-{refundOrderId}</span>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">เหตุผลการขอคืนเงิน</label>
                <textarea rows="4" required value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="อธิบายปัญหาที่เกิดขึ้นกับสินค้า..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">รูปภาพหลักฐาน (ถ้ามี)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImagePlus className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-300" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-300"><span className="font-semibold">คลิกเพื่ออัปโหลด</span></p>
                      <p className="text-xs text-slate-400 dark:text-slate-300">PNG, JPG (แนะนำขนาดไม่เกิน 2MB)</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
                {refundEvidence && (
                  <div className="mt-3 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={refundEvidence} alt="Evidence Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setRefundEvidence('')} className="absolute top-1 right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow">
                      <X className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
                <button type="submit" disabled={refundLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {refundLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>ยืนยันขอคืนเงิน</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
