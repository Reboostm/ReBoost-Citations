import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function AdminSetup() {
  const { currentUser, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  // Only show if user is not yet admin
  if (!currentUser || userProfile?.role === 'admin') {
    return null
  }

  const handleMakeAdmin = async () => {
    setLoading(true)
    try {
      const makeUserAdmin = httpsCallable(functions, 'makeUserAdmin')
      await makeUserAdmin({ targetUserId: currentUser.uid })
      toast.success('You are now an admin! Please refresh the page.')
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-2">Welcome to ReBoost Citations</h2>
        <p className="text-sm text-gray-600 mb-6">
          Looks like this is your first time. Let's set up your admin account so you can manage clients and users.
        </p>
        <Button onClick={handleMakeAdmin} loading={loading} className="w-full">
          Set Up Admin Account
        </Button>
        <p className="text-xs text-gray-400 mt-4">
          This is a one-time setup. You'll be able to create clients and manage users immediately after.
        </p>
      </div>
    </div>
  )
}
