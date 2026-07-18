import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Login from './pages/Login'
import ProductList from './pages/ProductList'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import Reports from './pages/Reports'
import Chat from './pages/Chat'
import AdminDashboard from './pages/AdminDashboard'
import RiderDashboard from './pages/RiderDashboard'
import { Loader2 } from 'lucide-react'


export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Guard for authenticated routes
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center h-screen bg-transparent space-y-4">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      )
    }
    if (!session) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-transparent space-y-4">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">กำลังโหลดข้อมูลแอปพลิเคชัน...</p>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-transparent font-sarabun flex flex-col justify-between">
        <div>
          <Navbar session={session} />
          <main className="pb-16 md:pb-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<ProductList session={session} />} />
              <Route
                path="/login"
                element={session ? <Navigate to="/" replace /> : <Login />}
              />

              {/* Protected Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile session={session} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders session={session} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports session={session} />
                  </ProtectedRoute>
                }
              />
              {/* Chat / Messenger */}
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat session={session} />
                  </ProtectedRoute>
                }
              />
              {/* Admin Dashboard — role check happens inside the component */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard session={session} />
                  </ProtectedRoute>
                }
              />
              {/* Rider Dashboard */}
              <Route
                path="/rider"
                element={
                  <ProtectedRoute>
                    <RiderDashboard session={session} />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  )
}
