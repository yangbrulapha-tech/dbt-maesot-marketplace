import React, { useState, useEffect, useCallback } from 'react'
import { supabase, getUserProfile } from '../supabaseClient'
import {
  Search, Plus, Filter, Tag, ShoppingCart, User, Loader2, X,
  MessageSquare, Send, Truck, Upload, Trash2, CheckCircle2, AlertCircle, ImageIcon, Pencil, Save
} from 'lucide-react'

// Schema จริง:
// products: product_id(PK bigint), seller_id(varchar=student_id), title, description, price, category, image_url, status, created_at
// users: student_id(PK varchar), full_name, email, role, created_at
// orders: order_id(PK bigint), product_id, buyer_id(varchar=student_id), rider_id, status, created_at
// messages: id(PK bigint), sender_id(varchar), receiver_id(varchar), product_id, content, is_read, created_at

// =============================================
// TOAST
// =============================================
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start space-x-3 p-4 rounded-xl shadow-lg border animate-slide-in-right ${t.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300'}`}>
          {t.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)}><X className="h-4 w-4 opacity-50 hover:opacity-100" /></button>
        </div>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mt-2" />
        <div className="border-t border-slate-100 pt-3 flex gap-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg flex-1" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  )
}

export default function ProductList({ session }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [userProfile, setUserProfile] = useState(null)

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [deleteLoadingId, setDeleteLoadingId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  
  // States สำหรับระบบแก้ไขสินค้า
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '', category: 'school_supplies', stock: 1 })
  const [editFile, setEditFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)

  const [toasts, setToasts] = useState([])
  const [checkoutProduct, setCheckoutProduct] = useState(null)
  const [messageProduct, setMessageProduct] = useState(null)

  const [newProduct, setNewProduct] = useState({ title: '', description: '', price: '', category: 'school_supplies', stock: 1 })
  const [productFile, setProductFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [riderForm, setRiderForm] = useState({ vehicle_type: 'walking', license_plate: '' })
  const [messageText, setMessageText] = useState('')

  const categories = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'school_supplies', label: 'อุปกรณ์การเรียน' },
    { value: 'electronics', label: 'อุปกรณ์อิเล็กทรอนิกส์' },
    { value: 'books', label: 'หนังสือเรียน' },
    { value: 'clothing', label: 'เครื่องแต่งกาย' },
    { value: 'others', label: 'อื่นๆ' },
  ]

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }, [])

  const removeToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  useEffect(() => {
    fetchProducts()
    if (session) fetchUserProfile()
  }, [session, selectedCategory])

  const fetchUserProfile = async () => {
    try {
      const { data } = await getUserProfile()
      if (data) setUserProfile(data)
    } catch (_) {}
  }

  // products: product_id(PK), seller_id(student_id), title, price, image_url, category, status
  const fetchProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*, seller:users(student_id, full_name, role)')
        .eq('status', 'available')

      if (selectedCategory) query = query.eq('category', selectedCategory)

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      addToast('ไม่สามารถโหลดสินค้าได้: ' + (err.message || ''), 'error')
    } finally {
      setLoading(false)
    }
  }

  // ลบประกาศขายสินค้า — สำหรับผู้ลงประกาศ (Seller) หรือผู้ดูแลระบบ (Admin)
  const handleDeleteProduct = async () => {
    if (!userProfile || !productToDelete) return
    const { product_id: productId, title: productTitle, seller_id: sellerId } = productToDelete

    const isSeller = userProfile.student_id === sellerId
    const isAdmin = userProfile.role === 'admin'

    if (!isSeller && !isAdmin) {
      addToast('คุณไม่มีสิทธิ์ลบสินค้าชิ้นนี้', 'error'); return
    }

    setDeleteLoadingId(productId)
    try {
      const { error } = await supabase.from('products').delete().eq('product_id', productId)
      if (error) throw error
      addToast(`ลบสินค้า "${productTitle}" เรียบร้อยแล้ว`, 'success')
      setIsDeleteModalOpen(false)
      setProductToDelete(null)
      fetchProducts()
    } catch (err) {
      addToast('ไม่สามารถลบสินค้าได้: ' + err.message, 'error')
    } finally {
      setDeleteLoadingId(null)
    }
  }

  // เปิดโมดอลแก้ไขข้อมูลสินค้า
  const openEditModal = (product) => {
    console.log("openEditModal called with product:", product)
    try {
      setProductToEdit(product)
      setEditForm({
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || 'school_supplies',
        stock: product.stock || 1,
      })
      setEditFile(null)
      setEditImagePreview(product.image_url)
      setIsEditModalOpen(true)
      console.log("isEditModalOpen set to true, productToEdit:", product)
    } catch (err) {
      console.error("Error in openEditModal:", err)
      alert("เกิดข้อผิดพลาดในการเปิดหน้าต่างแก้ไข: " + err.message)
    }
  }

  // บันทึกการแก้ไขข้อมูลสินค้า
  const handleUpdateProduct = async (e) => {
    e.preventDefault()
    if (!productToEdit || !userProfile) return
    setFormLoading(true)
    try {
      let finalImageUrl = productToEdit.image_url

      // 1. ตรวจสอบการเปลี่ยนภาพใหม่
      if (editFile) {
        const fileExt = editFile.name.split('.').pop().toLowerCase()
        const fileName = `${userProfile.student_id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('product-images').upload(fileName, editFile, { upsert: false })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
        finalImageUrl = publicUrl
      }

      // 2. อัปเดตข้อมูลลง Database
      const { error: dbError } = await supabase.from('products').update({
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        price: parseFloat(editForm.price),
        category: editForm.category,
        image_url: finalImageUrl,
        stock: parseInt(editForm.stock || 1, 10),
      }).eq('product_id', productToEdit.product_id)

      if (dbError) throw dbError

      addToast('แก้ไขรายละเอียดสินค้าเรียบร้อยแล้ว!', 'success')
      setIsEditModalOpen(false)
      setProductToEdit(null)
      setEditFile(null)
      setEditImagePreview(null)
      fetchProducts()
    } catch (err) {
      addToast('ไม่สามารถแก้ไขข้อมูลได้: ' + err.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const [requestRider, setRequestRider] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState('')

  const openCheckout = (product) => {
    if (!session || !userProfile) { addToast('กรุณาเข้าสู่ระบบก่อน', 'error'); return }
    if (userProfile.student_id === product.seller_id) { addToast('ไม่สามารถสั่งซื้อสินค้าตัวเองได้', 'error'); return }
    setCheckoutProduct(product)
    setRequestRider(false) // reset ทุกครั้งที่เปิด
    setDeliveryLocation('')
    setIsCheckoutModalOpen(true)
  }

  const handleConfirmOrder = async (e) => {
    e.preventDefault()
    if (!userProfile || !checkoutProduct) return
    setOrderLoading(true)
    try {
      const { error } = await supabase.from('orders').insert({
        product_id: checkoutProduct.product_id,
        buyer_id: userProfile.student_id,
        status: 'pending',
        needs_delivery: requestRider, // บันทึกคำขอ Rider
        delivery_location: deliveryLocation.trim() || null,
      })
      if (error) throw error

      // Add Notification
      await supabase.from('notifications').insert({
        user_id: checkoutProduct.seller_id,
        title: 'คำสั่งซื้อใหม่!',
        message: `มีคำสั่งซื้อใหม่สำหรับสินค้า "${checkoutProduct.title}" จาก ${userProfile.full_name}`,
        link: '/orders'
      })

      addToast(`สั่งซื้อ "${checkoutProduct.title}" สำเร็จแล้ว!`, 'success')
      setIsCheckoutModalOpen(false)
    } catch (err) {
      addToast('เกิดข้อผิดพลาดในการสั่งซื้อ: ' + err.message, 'error')
    } finally {
      setOrderLoading(false)
    }
  }


  // Direct Message — messages(sender_id=student_id, receiver_id=student_id, product_id)
  const openMessage = (product) => {
    if (!session || !userProfile) { addToast('กรุณาเข้าสู่ระบบก่อน', 'error'); return }
    if (userProfile.student_id === product.seller_id) { addToast('ไม่สามารถส่งข้อความหาตัวเองได้', 'error'); return }
    setMessageProduct(product)
    setMessageText(`สวัสดีครับ สนใจสินค้า "${product.title}" ราคา ฿${product.price} ครับ ขอนัดรับได้เลยไหมครับ?`)
    setIsMessageModalOpen(true)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!userProfile || !messageProduct) return
    setMsgLoading(true)
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: userProfile.student_id,
        receiver_id: messageProduct.seller_id,
        product_id: messageProduct.product_id,
        content: messageText,
        is_read: false,
      })
      if (error) throw error
      addToast(`ส่งข้อความหาผู้ขายเรียบร้อยแล้ว`, 'success')
      setIsMessageModalOpen(false)
      setMessageText('')
    } catch (err) {
      addToast('ไม่สามารถส่งข้อความได้: ' + err.message, 'error')
    } finally {
      setMsgLoading(false)
    }
  }

  // Rider Application — riders(student_id PK, vehicle_type, license_plate, is_active, rating)
  const handleApplyRider = async (e) => {
    e.preventDefault()
    if (!userProfile) return
    setFormLoading(true)
    try {
      const { error } = await supabase.from('riders').upsert({
        student_id: userProfile.student_id,
        vehicle_type: riderForm.vehicle_type,
        license_plate: riderForm.license_plate || '',
        is_active: false,
      }, { onConflict: 'student_id' })
      if (error) throw error
      addToast('สมัครเป็น Rider เรียบร้อยแล้ว! รอการอนุมัติ', 'success')
      setIsRiderModalOpen(false)
    } catch (err) {
      addToast('ไม่สามารถส่งใบสมัครได้: ' + err.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Upload product image → bucket product-images
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { addToast('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error'); return }
    setProductFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // Create Product — products(seller_id=student_id, title, description, price, category, image_url, status)
  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!userProfile || !productFile) { addToast('กรุณาเลือกรูปภาพสินค้าก่อน', 'error'); return }
    setFormLoading(true)
    try {
      const fileExt = productFile.name.split('.').pop().toLowerCase()
      const fileName = `${userProfile.student_id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images').upload(fileName, productFile, { upsert: false })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('products').insert({
        seller_id: userProfile.student_id,
        title: newProduct.title.trim(),
        description: newProduct.description.trim(),
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        image_url: publicUrl,
        status: 'available',
        stock: parseInt(newProduct.stock || 1, 10), // บันทึกจำนวนสินค้า
      })
      if (dbError) throw dbError

      addToast('ลงประกาศขายสินค้าเรียบร้อยแล้ว!', 'success')
      setIsProductModalOpen(false)
      setProductFile(null)
      setImagePreview(null)
      setNewProduct({ title: '', description: '', price: '', category: 'school_supplies', stock: 1 })
      fetchProducts()

    } catch (err) {
      addToast('ไม่สามารถลงขายสินค้าได้: ' + err.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const filtered = products.filter((p) =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCatLabel = (v) => categories.find((c) => c.value === v)?.label || 'อื่นๆ'
  const isAdmin = userProfile?.role === 'admin'

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <Toast toasts={toasts} removeToast={removeToast} />

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-primary-900 text-white p-8 sm:p-12 mb-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-sky-500/10 backdrop-blur-md rounded-full text-xs font-bold text-sky-400 border border-sky-400/25 uppercase tracking-widest">
            DBT MAE SOT — Marketplace
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mt-6 leading-relaxed tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            ตลาดซื้อขายสินค้า<br />
            <span className="text-sky-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)] block mt-2 animate-pulse-subtle">
              วิทยาลัยเทคนิคแม่สอด
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            ซื้อขายแลกเปลี่ยนสินค้าระหว่างนักเรียน นักศึกษา และบุคลากรภายในสถาบัน
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            {session ? (
              <>
                <button onClick={() => setIsProductModalOpen(true)} className="btn-gradient-primary flex items-center space-x-2 px-6 py-3 rounded-xl shadow-lg font-bold text-sm">
                  <Plus className="h-5 w-5" /><span>ลงประกาศขายสินค้า</span>
                </button>
                <button onClick={() => setIsRiderModalOpen(true)} className="btn-gradient-rider flex items-center space-x-2 px-6 py-3 rounded-xl shadow-lg font-bold text-sm">
                  <Truck className="h-5 w-5" /><span>สมัครเป็น Rider</span>
                </button>
              </>
            ) : (
              <a href="/login" className="btn-gradient-primary px-8 py-3 rounded-xl font-bold text-sm">เข้าสู่ระบบเพื่อเริ่มใช้งาน</a>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/80 mb-8 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-96">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-300"><Search className="h-5 w-5" /></span>
          <input type="text" placeholder="ค้นหาชื่อสินค้า..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-all" />
        </div>
        <div className="flex items-center space-x-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <Filter className="h-4 w-4 text-slate-400 dark:text-slate-300 shrink-0 hidden sm:inline" />
          <div className="flex space-x-1.5">
            {categories.map((cat) => (
              <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${selectedCategory === cat.value ? 'bg-navy-900 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm text-center py-20 px-4 max-w-xl mx-auto animate-scale-up">
          <Tag className="mx-auto h-16 w-16 text-primary-300 mb-4" />
          <h3 className="text-xl font-black text-navy-950">ไม่มีสินค้าในขณะนี้</h3>
          <p className="text-slate-500 dark:text-slate-300 text-sm mt-2">คุณต้องการเป็นผู้ลงประกาศขายสินค้าชิ้นแรกไหม?</p>
          {session && (
            <button onClick={() => setIsProductModalOpen(true)}
              className="mt-6 inline-flex items-center space-x-2 bg-navy-900 hover:bg-navy-800 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all">
              <Plus className="h-4 w-4 text-primary-400" /><span>ลงประกาศขาย</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <div key={product.product_id} className="ecommerce-card group relative">
              {(isAdmin || (userProfile && userProfile.student_id === product.seller_id)) && (
                <button onClick={() => { setProductToDelete(product); setIsDeleteModalOpen(true); }} disabled={deleteLoadingId === product.product_id}
                  className="absolute top-2 left-2 z-20 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-lg transition-all md:opacity-0 md:group-hover:opacity-100 disabled:opacity-50" 
                  title={userProfile?.student_id === product.seller_id ? "ลบประกาศขาย" : "Admin: ลบ"}>
                  {deleteLoadingId === product.product_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              )}

              {userProfile && userProfile.student_id === product.seller_id && (
                <button onClick={() => openEditModal(product)}
                  className="absolute top-2 left-10 z-20 bg-amber-600 hover:bg-amber-700 text-white p-1.5 rounded-lg shadow-lg transition-all md:opacity-0 md:group-hover:opacity-100 disabled:opacity-50" 
                  title="แก้ไขรายละเอียดสินค้า">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

              <div className="relative aspect-video sm:aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img src={product.image_url} alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400' }} />
                <span className="absolute top-3 right-3 bg-navy-900/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide">
                  {getCatLabel(product.category)}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1 group-hover:text-primary-600 transition-colors">{product.title}</h3>
                  <p className="text-slate-500 dark:text-slate-300 text-xs mt-1.5 line-clamp-2 min-h-[2rem] font-light">{product.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                  <span className="text-lg font-black text-navy-900 dark:text-white font-outfit mt-2 block">
                    ฿{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-300">
                      <User className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-300" />
                      <span className="text-[10px] font-bold truncate max-w-[100px]">{product.seller?.full_name || product.seller_id}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-300 font-mono">{product.seller_id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => openMessage(product)}
                      className="flex items-center justify-center space-x-1 border border-slate-300 hover:border-navy-600 hover:text-navy-900 dark:text-white bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg text-[10px] sm:text-xs transition-all">
                      <MessageSquare className="h-3.5 w-3.5" /><span>ส่งข้อความ</span>
                    </button>
                    <button onClick={() => openCheckout(product)}
                      className="flex items-center justify-center space-x-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 rounded-lg text-[10px] sm:text-xs shadow-sm transition-all">
                      <ShoppingCart className="h-3.5 w-3.5" /><span>สั่งซื้อ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

    {/* MODAL: RIDER */}
    {isRiderModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-scale-up">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2"><Truck className="h-5 w-5" /><h2 className="text-lg font-bold">สมัครเป็น Rider</h2></div>
            <button onClick={() => setIsRiderModalOpen(false)}><X className="h-5 w-5 text-emerald-100" /></button>
          </div>
          <form onSubmit={handleApplyRider} className="p-6 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              รหัสนักศึกษา: <span className="font-bold text-navy-900 dark:text-white">{userProfile?.student_id}</span> จะถูกบันทึกเป็น Rider อัตโนมัติ
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">ประเภทพาหนะ</label>
              <select value={riderForm.vehicle_type} onChange={(e) => setRiderForm({ ...riderForm, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="walking">เดินเท้า</option>
                <option value="bicycle">จักรยาน</option>
                <option value="motorcycle">รถมอเตอร์ไซค์</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">ป้ายทะเบียน (ถ้ามี)</label>
              <input type="text" value={riderForm.license_plate} onChange={(e) => setRiderForm({ ...riderForm, license_plate: e.target.value })}
                placeholder="เช่น กข 1234 ตาก"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="pt-2 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsRiderModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
              <button type="submit" disabled={formLoading}
                className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 disabled:opacity-50">
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>ส่งใบสมัคร</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: CHECKOUT */}
    {isCheckoutModalOpen && checkoutProduct && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-scale-up">
          <div className="bg-navy-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2"><ShoppingCart className="h-5 w-5 text-primary-400" /><h2 className="text-lg font-bold">ยืนยันสั่งซื้อ</h2></div>
            <button onClick={() => setIsCheckoutModalOpen(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-300" /></button>
          </div>
          <form onSubmit={handleConfirmOrder} className="p-6 space-y-4">
            <div className="flex space-x-3.5 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0">
                <img src={checkoutProduct.image_url} alt={checkoutProduct.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{checkoutProduct.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">ผู้ขาย: {checkoutProduct.seller?.full_name || checkoutProduct.seller_id}</p>
                <p className="text-sm font-black text-navy-900 dark:text-white mt-1">฿{Number(checkoutProduct.price).toLocaleString()}</p>
              </div>
            </div>

            {/* ตัวเลือกรูปแบบการจัดส่ง (Radio Cards) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                รูปแบบการรับสินค้า <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ตัวเลือกที่ 1: นัดรับเอง */}
                <div
                  onClick={() => setRequestRider(false)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    !requestRider
                      ? 'border-navy-900 bg-navy-50/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-navy-900 dark:text-white">📦 นัดพบเจอเอง</span>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${!requestRider ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300'}`}>
                        {!requestRider && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-800" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-normal">
                      นัดหมายสถานที่และรับสินค้า/ชำระเงินกับผู้ขายโดยตรง
                    </p>
                  </div>
                </div>

                {/* ตัวเลือกที่ 2: ส่งโดย Rider */}
                <div
                  onClick={() => setRequestRider(true)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    requestRider
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-emerald-800">🛵 ใช้บริการ Rider</span>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${requestRider ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                        {requestRider && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-800" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-normal">
                      ส่งออเดอร์ให้กลุ่ม Rider รับงานนำส่งสินค้าภายในสถาบัน
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ช่องระบุสถานที่จัดส่ง/นัดรับ */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                ระบุสถานที่จัดส่ง / นัดรับของ <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder={requestRider ? "ระบุสถานที่ให้ไรเดอร์ไปส่งให้ชัดเจน (เช่น หน้าตึก A, โรงอาหาร)" : "ระบุสถานที่ที่คุณจะไปนัดเจอผู้ขาย"}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all resize-none h-16 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            {/* ข้อความแจ้งเตือนด้านล่างตามตัวเลือก */}
            {!requestRider ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 leading-relaxed">
                📍 **แนะนำ:** หลังกดสั่งซื้อเรียบร้อย กรุณาใช้ระบบกล่องข้อความทักไปคุยกับผู้ขายเพื่อนัดรับสินค้า
              </p>
            ) : (
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 leading-relaxed">
                🛵 **ข้อมูล:** งานจะถูกส่งเข้าหน้าแดชบอร์ดของกลุ่มไรเดอร์ เมื่อมีไรเดอร์รับงานจะนำสินค้าไปส่งมอบให้คุณ ณ จุดนัดรับภายในสถาบัน
              </p>
            )}


            <div className="pt-2 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsCheckoutModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
              <button type="submit" disabled={orderLoading}
                className="flex items-center space-x-1.5 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-500 disabled:opacity-50">
                {orderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>ยืนยันสั่งซื้อ</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: MESSAGE */}
    {isMessageModalOpen && messageProduct && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-up">
          <div className="bg-navy-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2"><MessageSquare className="h-5 w-5 text-primary-400" /><h2 className="text-lg font-bold">ส่งข้อความหาผู้ขาย</h2></div>
            <button onClick={() => setIsMessageModalOpen(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-300" /></button>
          </div>
          <form onSubmit={handleSendMessage} className="p-6 space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border">
              ส่งถึง: <span className="font-bold text-navy-900 dark:text-white">{messageProduct.seller?.full_name || messageProduct.seller_id}</span> สำหรับสินค้า "<span className="font-bold">{messageProduct.title}</span>"
            </div>
            <textarea rows="4" required value={messageText} onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <div className="pt-2 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsMessageModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
              <button type="submit" disabled={msgLoading}
                className="flex items-center space-x-1.5 px-5 py-2 bg-navy-900 text-white rounded-lg text-sm font-bold hover:bg-navy-800 disabled:opacity-50">
                {msgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 text-primary-300" /><span>ส่งข้อความ</span></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: ADD PRODUCT */}
    {isProductModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] overflow-y-auto">
          <div className="bg-navy-900 text-white p-4 flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-lg font-bold">ลงประกาศขายสินค้า</h2>
            <button onClick={() => { setIsProductModalOpen(false); setImagePreview(null); setProductFile(null) }}><X className="h-5 w-5 text-slate-400 dark:text-slate-300" /></button>
          </div>
          <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">ชื่อสินค้า (title)</label>
              <input type="text" required value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                placeholder="เช่น หนังสือเรียนเขียนแบบ, เมาส์ไร้สาย"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">หมวดหมู่</label>
                <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800">
                  <option value="school_supplies">อุปกรณ์การเรียน</option>
                  <option value="electronics">อุปกรณ์อิเล็กทรอนิกส์</option>
                  <option value="books">หนังสือเรียน</option>
                  <option value="clothing">เครื่องแต่งกาย</option>
                  <option value="others">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">ราคา (บาท)</label>
                <input type="number" step="0.01" min="0" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="250"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">จำนวนสต็อก (ชิ้น)</label>
                <input type="number" min="1" step="1" required value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value, 10) })}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">รายละเอียด</label>
              <textarea rows="3" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="สภาพสินค้า ตำหนิ สถานที่นัดรับ..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">รูปภาพสินค้า <span className="text-red-500">*</span></label>
              <label htmlFor="img-upload"
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${imagePreview ? 'border-primary-400 bg-primary-50' : 'border-slate-300 bg-slate-50 dark:bg-slate-900/50 hover:border-primary-400'}`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-contain rounded-xl p-1" />
                ) : (
                  <><ImageIcon className="h-10 w-10 text-slate-300 mb-2" /><span className="text-xs font-bold text-slate-500 dark:text-slate-300">คลิกเพื่อเลือกรูป</span><span className="text-[10px] text-slate-400 dark:text-slate-300">JPG, PNG, WebP (สูงสุด 5MB)</span></>
                )}
                <input id="img-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <div className="pt-2 flex justify-end space-x-3">
              <button type="button" onClick={() => { setIsProductModalOpen(false); setImagePreview(null); setProductFile(null) }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
              <button type="submit" disabled={formLoading}
                className="flex items-center space-x-1.5 px-5 py-2 bg-navy-900 text-white rounded-lg text-sm font-bold hover:bg-navy-800 disabled:opacity-50">
                {formLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>กำลังอัปโหลด...</span></> : <><Upload className="h-4 w-4 text-primary-400" /><span>ลงประกาศขาย</span></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: EDIT PRODUCT */}
    {isEditModalOpen && productToEdit && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-up max-h-[90vh] overflow-y-auto">
          <div className="bg-navy-900 text-white p-4 flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-lg font-bold">แก้ไขรายละเอียดสินค้า</h2>
            <button onClick={() => { setIsEditModalOpen(false); setEditImagePreview(null); setEditFile(null) }}><X className="h-5 w-5 text-slate-400 dark:text-slate-300" /></button>
          </div>
          <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">ชื่อสินค้า (title)</label>
              <input type="text" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="เช่น หนังสือเรียนเขียนแบบ, เมาส์ไร้สาย"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">หมวดหมู่</label>
                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800">
                  <option value="school_supplies">อุปกรณ์การเรียน</option>
                  <option value="electronics">อุปกรณ์อิเล็กทรอนิกส์</option>
                  <option value="books">หนังสือเรียน</option>
                  <option value="clothing">เครื่องแต่งกาย</option>
                  <option value="others">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">ราคา (บาท)</label>
                <input type="number" step="0.01" min="0" required value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  placeholder="250"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">จำนวนสต็อก (ชิ้น)</label>
                <input type="number" min="0" step="1" required value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value, 10) })}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">รายละเอียด</label>
              <textarea rows="3" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="สภาพสินค้า ตำหนิ สถานที่นัดรับ..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">รูปภาพสินค้า (ปล่อยว่างไว้หากต้องการใช้รูปเดิม)</label>
              <label htmlFor="edit-img-upload"
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${editImagePreview ? 'border-primary-400 bg-primary-50' : 'border-slate-300 bg-slate-50 dark:bg-slate-900/50 hover:border-primary-400'}`}>
                {editImagePreview ? (
                  <img src={editImagePreview} alt="preview" className="w-full h-full object-contain rounded-xl p-1" />
                ) : (
                  <><ImageIcon className="h-10 w-10 text-slate-300 mb-2" /><span className="text-xs font-bold text-slate-500 dark:text-slate-300">คลิกเพื่อเปลี่ยนรูป</span><span className="text-[10px] text-slate-400 dark:text-slate-300">JPG, PNG, WebP (สูงสุด 5MB)</span></>
                )}
                <input id="edit-img-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    setEditFile(file)
                    setEditImagePreview(URL.createObjectURL(file))
                  }
                }} />
              </label>
            </div>
            <div className="pt-2 flex justify-end space-x-3">
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditImagePreview(null); setEditFile(null) }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50">ยกเลิก</button>
              <button type="submit" disabled={formLoading}
                className="flex items-center space-x-1.5 px-5 py-2 bg-navy-900 text-white rounded-lg text-sm font-bold hover:bg-navy-800 disabled:opacity-50">
                {formLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>กำลังอัปโหลด...</span></> : <><Save className="h-4 w-4 text-primary-400" /><span>บันทึกการแก้ไข</span></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: DELETE CONFIRMATION */}
    {isDeleteModalOpen && productToDelete && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-scale-up">
          <div className="bg-red-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <h2 className="text-lg font-bold">ยืนยันการลบประกาศขาย</h2>
            </div>
            <button onClick={() => { setIsDeleteModalOpen(false); setProductToDelete(null); }} className="text-red-200 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-start space-x-3 bg-red-50 text-red-800 p-3.5 rounded-xl border border-red-200 text-xs leading-relaxed">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <span>คำเตือน: การลบประกาศขายสินค้าชิ้นนี้จะเป็นการลบข้อมูลถาวรออกจากหน้าร้านค้าและตารางสินค้าในระบบ ไม่สามารถย้อนคืนได้</span>
            </div>

            {/* Product Preview */}
            <div className="flex space-x-3.5 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0">
                <img src={productToDelete.image_url} alt={productToDelete.title} className="w-full h-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{productToDelete.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 truncate">หมวดหมู่: {getCatLabel(productToDelete.category)}</p>
                <p className="text-sm font-black text-red-700 mt-1">฿{Number(productToDelete.price).toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => { setIsDeleteModalOpen(false); setProductToDelete(null); }} 
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900/50 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={handleDeleteProduct} 
                disabled={deleteLoadingId === productToDelete.product_id}
                className="flex items-center space-x-1.5 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleteLoadingId === productToDelete.product_id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 text-red-200" />
                    <span>ยืนยันลบประกาศ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}


