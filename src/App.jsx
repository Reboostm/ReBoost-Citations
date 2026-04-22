import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AdminLayout from '@/components/layout/AdminLayout'
import ClientLayout from '@/components/layout/ClientLayout'
import AdminSetup from '@/components/AdminSetup'

// Auth pages
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminClients from '@/pages/admin/Clients'
import AdminClientDetail from '@/pages/admin/ClientDetail'
import AdminUsers from '@/pages/admin/Users'
import AdminDirectories from '@/pages/admin/Directories'
import AdminPackages from '@/pages/admin/Packages'
import AdminJobs from '@/pages/admin/Jobs'
import AdminReports from '@/pages/admin/Reports'
import AdminCitationAudit from '@/pages/admin/CitationAudit'
import AdminSettings from '@/pages/admin/Settings'

// Client pages
import ClientDashboard from '@/pages/client/Dashboard'
import ClientCitations from '@/pages/client/Citations'
import PublicReport from '@/pages/PublicReport'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!currentUser) return <Navigate to="/login" />
  if (requireAdmin && userProfile?.role !== 'admin') return <Navigate to="/dashboard" />

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<AdminDashboard />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="clients/:id" element={<AdminClientDetail />} />
            <Route path="clients/:id/edit" element={<AdminClientDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="directories" element={<AdminDirectories />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="audit" element={<AdminCitationAudit />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Client Routes */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<ClientDashboard />} />
            <Route path="citations" element={<ClientCitations />} />
            <Route path="reports" element={<ClientDashboard />} />
          </Route>

          {/* Public Routes */}
          <Route path="/report/:token" element={<PublicReport />} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#fff', color: '#000', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            success: { style: { color: '#059669' } },
            error: { style: { color: '#dc2626' } },
          }}
        />
        <AdminSetup />
      </AuthProvider>
    </BrowserRouter>
  )
}
