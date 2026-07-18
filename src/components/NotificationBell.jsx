import React, { useState, useEffect } from 'react'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function NotificationBell({ session }) {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [studentId, setStudentId] = useState(null)

  useEffect(() => {
    if (session) {
      const id = session.user.email?.split('@')[0]
      setStudentId(id)
    }
  }, [session])

  useEffect(() => {
    if (studentId) {
      fetchNotifications()
      
      // ตั้งเวลาโหลดใหม่ทุกๆ 1 นาที เผื่อ Realtime ไม่ทำงาน
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [studentId])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        if (error.code !== '42P01') console.error('Error fetching notifications:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } catch (err) {}
  }

  const markAsRead = async (id) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {}
  }

  const markAllAsRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', studentId).eq('is_read', false)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {}
  }

  const deleteNotification = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await supabase.from('notifications').delete().eq('id', id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      fetchNotifications() // อัปเดต unread count ใหม่
    } catch (err) {}
  }

  if (!session) return null

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white transition-colors focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-navy-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-scale-up origin-top-right">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center space-x-1">
                  <Check className="h-3 w-3" />
                  <span>อ่านทั้งหมด</span>
                </button>
              )}
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {notifications.map(n => (
                    <Link 
                      key={n.id} 
                      to={n.link || '#'} 
                      onClick={() => { markAsRead(n.id); setIsOpen(false) }}
                      className={`block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!n.is_read ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                            {new Date(n.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="shrink-0 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                          </div>
                        )}
                        <button onClick={(e) => deleteNotification(n.id, e)} className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-300 transition-all self-start">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
