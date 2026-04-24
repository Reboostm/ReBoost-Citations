import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getClient } from '@/services/firestore'
import Sidebar from './Sidebar'
import HelpButton from '@/components/support/HelpButton'

export default function ClientLayout() {
  const { userProfile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        if (!userProfile?.clientId) {
          setNeedsOnboarding(false)
          return
        }

        const client = await getClient(userProfile.clientId)
        // If they don't have businessProfile marked as true, they need onboarding
        setNeedsOnboarding(!client?.businessProfile)
      } catch (err) {
        console.error('Error checking onboarding:', err)
        setNeedsOnboarding(false)
      } finally {
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [userProfile])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  // Redirect to onboarding if needed
  if (needsOnboarding) {
    return <Navigate to="/onboarding" />
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900 text-sm">ReBoost Citations</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Help Button */}
      <HelpButton />
    </div>
  )
}
