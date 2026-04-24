import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getClient, getCitationsForClient, getDirectories } from '@/services/firestore'
import { Copy, Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const statusIcon = (status) => {
  const map = {
    live: <CheckCircle className="w-4 h-4 text-green-500" />,
    submitted: <Clock className="w-4 h-4 text-blue-500" />,
    pending: <Clock className="w-4 h-4 text-yellow-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    needs_manual_review: <AlertCircle className="w-4 h-4 text-orange-500" />,
  }
  return map[status?.toLowerCase()] ?? <AlertCircle className="w-4 h-4 text-gray-400" />
}

export default function MyListings() {
  const { userProfile } = useAuth()
  const [client, setClient] = useState(null)
  const [citations, setCitations] = useState([])
  const [directories, setDirectories] = useState({})
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState({})

  useEffect(() => {
    const load = async () => {
      try {
        if (!userProfile?.clientId) {
          setLoading(false)
          return
        }

        const [clientData, citationsData, dirsData] = await Promise.all([
          getClient(userProfile.clientId),
          getCitationsForClient(userProfile.clientId),
          getDirectories(),
        ])

        setClient(clientData)
        setCitations(citationsData)

        // Create directory map
        const dirMap = {}
        dirsData.forEach(d => {
          dirMap[d.id] = d
        })
        setDirectories(dirMap)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userProfile])

  const togglePasswordVisibility = (citationId) => {
    setShowPassword(prev => ({
      ...prev,
      [citationId]: !prev[citationId],
    }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  if (loading) return <PageLoader />

  if (!client) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">No client profile found. Please contact support.</p>
        </div>
      </div>
    )
  }

  // Separate citations by tier
  const highValueCitations = citations.filter(c => {
    const dir = directories[c.directoryId]
    return dir?.useCustomerEmail === true
  })

  const standardCitations = citations.filter(c => {
    const dir = directories[c.directoryId]
    return dir?.useCustomerEmail !== true
  })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="My Citation Listings"
        subtitle={`${citations.length} total listings for ${client.businessName}`}
      />

      {/* Master Password Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Master Password:</strong> {client.masterPassword || 'Business@2025'} (used for all registrations)
        </p>
      </div>

      {/* Premium Listings */}
      {highValueCitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-600 rounded-full" />
            Premium Listings ({highValueCitations.length})
          </h2>
          <div className="space-y-3">
            {highValueCitations.map(cit => (
              <ListingCard
                key={cit.id}
                citation={cit}
                directory={directories[cit.directoryId]}
                email={client.publicEmail || client.accountEmail}
                password={client.masterPassword || 'Business@2025'}
                showPassword={showPassword[cit.id]}
                onTogglePassword={() => togglePasswordVisibility(cit.id)}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standard Listings */}
      {standardCitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            Standard Listings ({standardCitations.length})
          </h2>
          <div className="space-y-3">
            {standardCitations.map(cit => (
              <ListingCard
                key={cit.id}
                citation={cit}
                directory={directories[cit.directoryId]}
                email={cit.emailUsed || client.accountEmail}
                password={client.masterPassword || 'Business@2025'}
                showPassword={showPassword[cit.id]}
                onTogglePassword={() => togglePasswordVisibility(cit.id)}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        </div>
      )}

      {citations.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No listings yet. Your citations will appear here once they're submitted.</p>
        </div>
      )}
    </div>
  )
}

function ListingCard({ citation, directory, email, password, showPassword, onTogglePassword, onCopy }) {
  const dir = directory || { name: citation.directoryName }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900 truncate">{dir.name}</p>
            {statusIcon(citation.status)}
          </div>
          <p className="text-xs text-gray-500">{citation.status}</p>
        </div>
        {citation.liveUrl && (
          <a
            href={citation.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:text-brand-700 flex-shrink-0"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        )}
      </div>

      {/* Email and Password */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">Email</p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-gray-900 font-mono flex-1 truncate">{email}</code>
            <button
              onClick={() => onCopy(email)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy email"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Password</p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-gray-900 font-mono flex-1">
              {showPassword ? password : '••••••••'}
            </code>
            <button
              onClick={onTogglePassword}
              className="text-gray-400 hover:text-gray-600"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onCopy(password)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy password"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Failure Reason */}
      {citation.status === 'failed' && citation.failureReason && (
        <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-2">
          <p className="text-xs text-red-700">
            <strong>Failure Reason:</strong> {citation.failureReason}
          </p>
        </div>
      )}
    </div>
  )
}
