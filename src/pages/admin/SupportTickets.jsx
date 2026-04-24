import { useState, useEffect } from 'react'
import { MessageCircle, Clock, CheckCircle, User, Mail, AlertCircle } from 'lucide-react'
import { getSupportTickets, updateSupportTicket } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Textarea from '@/components/ui/Textarea'
import { formatDate } from '@/utils/helpers'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

export default function SupportTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const data = await getSupportTickets()
        setTickets(data)
      } catch (err) {
        console.error('Error loading tickets:', err)
        toast.error('Failed to load support tickets')
      } finally {
        setLoading(false)
      }
    }

    loadTickets()
  }, [])

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateSupportTicket(ticketId, { status: newStatus })
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }
      toast.success(`Ticket marked as ${newStatus}`)
    } catch (err) {
      console.error('Error updating ticket:', err)
      toast.error('Failed to update ticket')
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()

    if (!reply.trim()) {
      toast.error('Please enter a reply')
      return
    }

    setSubmitting(true)
    try {
      const notes = (selectedTicket.notes || []).concat({
        admin: true,
        message: reply,
        timestamp: new Date().toISOString(),
      })

      await updateSupportTicket(selectedTicket.id, { notes })
      setSelectedTicket({ ...selectedTicket, notes })
      setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, notes } : t))
      setReply('')
      toast.success('Reply sent')
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error('Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true
    return t.status === filter
  })

  const stats = [
    { label: 'Open', count: tickets.filter(t => t.status === 'open').length, color: 'blue' },
    { label: 'In Progress', count: tickets.filter(t => t.status === 'in_progress').length, color: 'yellow' },
    { label: 'Resolved', count: tickets.filter(t => t.status === 'resolved').length, color: 'green' },
  ]

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Support Tickets"
        subtitle="Manage customer support requests"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => {
          const colors = {
            blue: 'bg-blue-50 text-blue-700',
            yellow: 'bg-yellow-50 text-yellow-700',
            green: 'bg-green-50 text-green-700',
          }
          return (
            <div key={s.label} className={cn('rounded-lg p-4 text-center', colors[s.color])}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm font-medium">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <Card padding={false}>
            <div className="p-5 border-b border-gray-200">
              <CardTitle>Tickets ({filteredTickets.length})</CardTitle>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50">
              {['open', 'in_progress', 'resolved', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-2 text-xs font-medium rounded-lg transition-colors capitalize',
                    filter === f
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {f === 'in_progress' ? 'In Progress' : f}
                </button>
              ))}
            </div>

            {/* Tickets */}
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No tickets</p>
              ) : (
                filteredTickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      'w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4',
                      selectedTicket?.id === ticket.id
                        ? 'border-l-brand-600 bg-gray-50'
                        : 'border-l-transparent',
                      ticket.status === 'resolved' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{
                          backgroundColor:
                            ticket.status === 'open' ? '#3b82f6' :
                            ticket.status === 'in_progress' ? '#f59e0b' :
                            '#10b981'
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(ticket.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Ticket Detail */}
        {selectedTicket ? (
          <div className="lg:col-span-2">
            <Card>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedTicket.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selectedTicket.message}</p>
                  </div>
                  <Badge
                    variant={
                      selectedTicket.status === 'open' ? 'blue' :
                      selectedTicket.status === 'in_progress' ? 'yellow' :
                      'green'
                    }
                  >
                    {selectedTicket.status}
                  </Badge>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Customer</span>
                  </div>
                  {selectedTicket.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${selectedTicket.email}`} className="text-brand-600 hover:underline">
                        {selectedTicket.email}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                    <Clock className="w-3 h-3" />
                    Submitted {formatDate(selectedTicket.createdAt)}
                  </div>
                </div>

                {/* Status Actions */}
                <div className="flex gap-2">
                  {selectedTicket.status !== 'in_progress' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {selectedTicket.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes/Conversation */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-brand-600" />
                  Notes & Replies
                </h3>

                {/* Notes List */}
                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                  {selectedTicket.notes && selectedTicket.notes.length > 0 ? (
                    selectedTicket.notes.map((note, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg p-3',
                          note.admin
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {note.admin ? '🔧 Admin' : '👤 Customer'}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(note.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{note.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
                  )}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'resolved' && (
                  <form onSubmit={handleReply} className="space-y-3 border-t pt-4">
                    <Textarea
                      placeholder="Type your reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={submitting}
                      rows={3}
                    />
                    <Button
                      type="submit"
                      loading={submitting}
                      className="w-full"
                    >
                      Send Reply
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2">
            <Card className="h-96 flex items-center justify-center text-center">
              <div>
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Select a ticket to view details</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
