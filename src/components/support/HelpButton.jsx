import { useState } from 'react'
import { HelpCircle, Send, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupportTicket } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function HelpButton() {
  const { userProfile, currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      await createSupportTicket({
        userId: currentUser.uid,
        email: userProfile?.email,
        clientId: userProfile?.clientId,
        title,
        message,
        status: 'open',
      })

      toast.success('Support ticket submitted! We\'ll get back to you soon.')
      setTitle('')
      setMessage('')
      setOpen(false)
    } catch (err) {
      console.error('Error submitting ticket:', err)
      toast.error('Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-colors z-40 hover:shadow-xl"
        title="Get help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Get Help</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Input
                  label="Subject *"
                  placeholder="What do you need help with?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <Textarea
                  label="Message *"
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
