import { useEffect, useState } from 'react'
import { Plus, Search, Mail, Shield, Building2, Trash2, Edit2 } from 'lucide-react'
import { getCollection, createUser, updateUser, deleteDocument, getClients } from '@/services/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import toast from 'react-hot-toast'

const createSchema = z.object({
  email:               z.string().email('Invalid email'),
  password:            z.string().min(6, 'Password must be at least 6 characters'),
  role:                z.enum(['admin', 'client']),
  clientId:            z.string().optional(),
  sendPasswordReset:   z.boolean().optional(),
})

const editSchema = z.object({
  email:    z.string().email('Invalid email'),
  role:     z.enum(['admin', 'client']),
  clientId: z.string().optional(),
})

function UserForm({ user, clients, onSubmit, loading }) {
  const isCreating = !user
  const schema = isCreating ? createSchema : editSchema

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email:             user?.email    ?? '',
      password:          '',
      role:              user?.role     ?? 'client',
      clientId:          user?.clientId ?? '',
      sendPasswordReset: false,
    },
  })

  const role = watch('role')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email *"
        type="email"
        placeholder="user@example.com"
        disabled={!isCreating}
        error={errors.email?.message}
        {...register('email')}
      />

      {isCreating && (
        <>
          <Input
            label="Password *"
            type="password"
            placeholder="••••••••"
            hint="Minimum 6 characters (e.g., 123456)"
            error={errors.password?.message}
            {...register('password')}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('sendPasswordReset')}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Also send password reset email</span>
          </label>
        </>
      )}

      <Select
        label="Role *"
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'client', label: 'Client' },
        ]}
        error={errors.role?.message}
        {...register('role')}
      />
      {role === 'client' && (
        <Select
          label="Linked Client"
          placeholder="Select a client (optional)"
          options={[
            { value: '', label: 'None' },
            ...clients.map(c => ({ value: c.id, label: c.businessName })),
          ]}
          error={errors.clientId?.message}
          {...register('clientId')}
        />
      )}

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        <strong>✓ Auth Setup:</strong> Creating user will automatically set up Firebase Authentication. User can log in immediately with provided password.
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}

export default function Users() {
  const [users, setUsers]       = useState([])
  const [filtered, setFiltered] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const [usersData, clientsData] = await Promise.all([
      getCollection('users'),
      getClients(),
    ])
    setUsers(usersData)
    setFiltered(usersData)
    setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    ))
  }, [search, users])

  const getClientName = (clientId) => {
    if (!clientId) return '—'
    const client = clients.find(c => c.id === clientId)
    return client?.businessName ?? 'Unknown'
  }

  const handleAdd = async (data) => {
    setSaving(true)
    try {
      // Call Cloud Function to create Firebase Auth user + Firestore user
      const createUserWithClient = httpsCallable(functions, 'createUserWithClient')

      const response = await createUserWithClient({
        email: data.email,
        password: data.password,
        role: data.role,
        businessData: null, // Admin creation doesn't create client
      })

      // Send password reset email if requested
      if (data.sendPasswordReset) {
        try {
          await fetch('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' +
            import.meta.env.VITE_FIREBASE_API_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email: data.email,
            }),
          })
          toast.success(`User created! Password reset email sent to ${data.email}`)
        } catch {
          toast.success(`User created! (Password reset email could not be sent)`)
        }
      } else {
        toast.success(`User created with email: ${data.email}`)
      }

      setShowAdd(false)
      load()
    } catch (err) {
      let errorMsg = err.message
      if (err.message?.includes('Email already')) errorMsg = 'Email already in use'
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data) => {
    setSaving(true)
    try {
      await updateUser(editing.id, data)
      toast.success('User updated!')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteDocument('users', deleteTarget.id)
      toast.success('User deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} user${users.length !== 1 ? 's' : ''}`}
        action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add User</Button>}
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={search ? 'No users match your search' : 'No users yet'}
          description={search ? 'Try a different search term.' : 'Add your first user to get started.'}
          action={!search && <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add User</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Linked Client</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={user.role === 'admin' ? 'purple' : 'blue'}>
                        {user.role === 'admin' ? <><Shield className="w-3 h-3 mr-1" />Admin</> : 'Client'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {user.clientId ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          {getClientName(user.clientId)}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add User" size="md">
        <UserForm clients={clients} onSubmit={handleAdd} loading={saving} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit User" size="md">
        {editing && <UserForm user={editing} clients={clients} onSubmit={handleEdit} loading={saving} />}
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User"
        message={`Delete "${deleteTarget?.email}"? This cannot be undone.`}
      />
    </div>
  )
}
