import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (ts) => {
  if (!ts) return '—'
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  return format(date, 'MMM d, yyyy')
}

export const formatDateTime = (ts) => {
  if (!ts) return '—'
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  return format(date, 'MMM d, yyyy h:mm a')
}

export const timeAgo = (ts) => {
  if (!ts) return '—'
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  return formatDistanceToNow(date, { addSuffix: true })
}

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0)

export const formatPhone = (phone) => {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (digits.length === 10)
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

export const slugify = (str) =>
  str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

export const generateShareToken = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36)

export const statusColor = (status) => {
  const map = {
    pending:             'bg-yellow-100 text-yellow-800',
    submitted:           'bg-blue-100 text-blue-800',
    live:                'bg-green-100 text-green-800',
    failed:              'bg-red-100 text-red-800',
    needs_manual_review: 'bg-orange-100 text-orange-800',
    verification_sent:   'bg-purple-100 text-purple-800',
    duplicate:           'bg-gray-100 text-gray-600',
    running:             'bg-blue-100 text-blue-800',
    paused:              'bg-yellow-100 text-yellow-800',
    completed:           'bg-green-100 text-green-800',
  }
  return map[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

export const tierColor = (tier) => {
  const map = {
    high:   'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low:    'bg-gray-100 text-gray-600',
  }
  return map[tier?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

export const truncate = (str, len = 60) =>
  str && str.length > len ? str.slice(0, len) + '…' : str
