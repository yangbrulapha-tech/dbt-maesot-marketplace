import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, getUserProfile } from '../supabaseClient'
import { MessageSquare, Send, Loader2, ArrowLeft, User, Wifi, WifiOff } from 'lucide-react'

// Schema จริง:
// messages: id(PK bigint), sender_id(student_id varchar), receiver_id(student_id varchar),
//           product_id(bigint), content, is_read, created_at
// users: student_id(PK), full_name, email

export default function Chat({ session }) {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const scrollContainerRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (session) initChat()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [session])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const initChat = async () => {
    setLoading(true)
    try {
      const { data: profile } = await getUserProfile()
      if (profile) {
        setUserProfile(profile)
        await fetchConversations(profile.student_id)
      }
    } catch (_) {}
    setLoading(false)
  }

  // ดึงข้อความทั้งหมดของ user แล้ว group เป็น conversations
  const fetchConversations = async (myStudentId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${myStudentId},receiver_id.eq.${myStudentId}`)
      .order('created_at', { ascending: false })

    if (error || !data) return

    // Group by partner student_id + product_id
    const convMap = new Map()
    data.forEach((msg) => {
      const partnerId = msg.sender_id === myStudentId ? msg.receiver_id : msg.sender_id
      const key = `${partnerId}_${msg.product_id || 'general'}`
      if (!convMap.has(key)) {
        convMap.set(key, {
          partnerId,
          productId: msg.product_id,
          lastMsg: msg.content,
          lastTime: msg.created_at,
          unread: 0,
        })
      }
      if (!msg.is_read && msg.receiver_id === myStudentId) {
        const conv = convMap.get(key)
        convMap.set(key, { ...conv, unread: conv.unread + 1 })
      }
    })

    // ดึงชื่อ partner จาก users table
    const convArr = []
    for (const [key, conv] of convMap.entries()) {
      const { data: partnerData } = await supabase
        .from('users')
        .select('student_id, full_name')
        .eq('student_id', conv.partnerId)
        .single()
      convArr.push({ ...conv, key, partnerName: partnerData?.full_name || conv.partnerId })
    }

    setConversations(convArr.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime)))
  }

  const openConversation = async (conv) => {
    if (!userProfile) return
    setSelectedConv(conv)
    setMsgLoading(true)
    setMessages([])

    // ยกเลิก channel เก่า
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    setIsLive(false)

    // ดึงข้อความในการสนทนานี้
    const query = supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userProfile.student_id},receiver_id.eq.${conv.partnerId}),and(sender_id.eq.${conv.partnerId},receiver_id.eq.${userProfile.student_id})`)
      .order('created_at', { ascending: true })

    if (conv.productId) query.eq('product_id', conv.productId)

    const { data } = await query
    setMessages(data || [])
    setMsgLoading(false)

    // Mark as read
    await supabase.from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userProfile.student_id)
      .eq('sender_id', conv.partnerId)

    // Subscribe Realtime
    const channel = supabase
      .channel(`chat:${userProfile.student_id}:${conv.partnerId}:${conv.productId || 'general'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userProfile.student_id}`,
      }, (payload) => {
        if (payload.new.sender_id === conv.partnerId) {
          setMessages((prev) => [...prev, payload.new])
          supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || !userProfile || !selectedConv) return
    setSendLoading(true)

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      sender_id: userProfile.student_id,
      receiver_id: selectedConv.partnerId,
      product_id: selectedConv.productId,
      content: inputText.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setInputText('')

    try {
      const { data: sent, error } = await supabase.from('messages').insert({
        sender_id: userProfile.student_id,
        receiver_id: selectedConv.partnerId,
        product_id: selectedConv.productId || null,
        content: optimisticMsg.content,
        is_read: false,
      }).select().single()

      if (error) throw error

      // Add Notification
      await supabase.from('notifications').insert({
        user_id: selectedConv.partnerId,
        title: 'ข้อความใหม่',
        message: `มีข้อความใหม่จากคุณ`,
        link: '/chat'
      })

      // แทน optimistic ด้วย real msg
      setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? sent : m))
      fetchConversations(userProfile.student_id)
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
    } finally {
      setSendLoading(false)
    }
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 space-y-4">
      <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
      <p className="text-slate-500 text-sm">กำลังโหลดการสนทนา...</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">ข้อความ</h1>
        <p className="mt-1 text-slate-500">ติดต่อผู้ซื้อผู้ขายโดยตรง</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-extrabold text-navy-900">การสนทนาทั้งหมด</h2>
              <p className="text-xs text-slate-400 mt-0.5">{userProfile?.student_id} · {userProfile?.full_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageSquare className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-sm font-bold text-slate-400">ยังไม่มีการสนทนา</p>
                  <p className="text-xs text-slate-400 mt-1">กดปุ่มข้อความในหน้าสินค้าเพื่อเริ่มแชทกับผู้ขาย</p>
                </div>
              ) : conversations.map((conv) => (
                <button key={conv.key} onClick={() => openConversation(conv)}
                  className={`w-full text-left px-4 py-4 hover:bg-slate-50 transition-colors flex items-start space-x-3 ${selectedConv?.key === conv.key ? 'bg-primary-50 border-l-2 border-primary-600' : ''}`}>
                  <div className="h-10 w-10 bg-navy-900 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm">
                    {(conv.partnerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-navy-900 truncate">{conv.partnerName}</span>
                      {conv.unread > 0 && <span className="ml-1 px-1.5 py-0.5 bg-primary-600 text-white text-[9px] font-bold rounded-full shrink-0">{conv.unread}</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">{conv.partnerId}</p>
                    {conv.productId && <p className="text-[10px] text-primary-600 font-bold mt-0.5">📦 Product #{conv.productId}</p>}
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{conv.lastMsg}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
            {!selectedConv ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">เลือกการสนทนา</h3>
                <p className="text-sm text-slate-400 mt-1">กดที่ชื่อผู้ใช้ทางซ้ายเพื่อเปิดแชท</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setSelectedConv(null)} className="md:hidden mr-1 text-slate-500 hover:text-navy-900">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="h-9 w-9 bg-navy-900 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(selectedConv.partnerName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-900">{selectedConv.partnerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{selectedConv.partnerId}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${isLive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                    {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    <span>{isLive ? 'Live' : 'Connecting...'}</span>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  {msgLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 text-primary-500 animate-spin" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-10 w-10 text-slate-200 mb-2" />
                      <p className="text-xs text-slate-400 font-bold">ยังไม่มีข้อความ เริ่มสนทนาได้เลย!</p>
                    </div>
                  ) : messages.map((msg) => {
                    const isOwn = msg.sender_id === userProfile?.student_id
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {!isOwn && (
                          <div className="h-7 w-7 bg-navy-900 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 self-end">
                            {(selectedConv.partnerName || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isOwn ? 'bg-navy-900 text-white rounded-br-md' : 'bg-white text-slate-900 border border-slate-200 rounded-bl-md'} ${msg._optimistic ? 'opacity-70' : ''}`}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className={`text-[10px] mt-1.5 ${isOwn ? 'text-slate-400 text-right' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                      placeholder="พิมพ์ข้อความ..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <button type="submit" disabled={sendLoading || !inputText.trim()}
                    className="p-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl shadow-md transition-all disabled:opacity-50 shrink-0">
                    {sendLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-primary-400" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
