import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, writeBatch, increment, arrayUnion,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── Generic helpers ─────────────────────────────────────────────────────────

export const getDocument = async (path, id) => {
  const snap = await getDoc(doc(db, path, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const getCollection = async (path, constraints = []) => {
  const q = query(collection(db, path), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const createDocument = async (path, data, id = null) => {
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  if (id) {
    await setDoc(doc(db, path, id), payload)
    return id
  }
  const ref = await addDoc(collection(db, path), payload)
  return ref.id
}

export const updateDocument = async (path, id, data) => {
  await updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() })
}

export const deleteDocument = async (path, id) => {
  await deleteDoc(doc(db, path, id))
}

export const subscribeToCollection = (path, constraints, callback) => {
  const q = query(collection(db, path), ...constraints)
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export const subscribeToDocument = (path, id, callback) => {
  return onSnapshot(doc(db, path, id), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const getClients = () => getCollection('clients', [orderBy('businessName')])

export const getClient = (id) => getDocument('clients', id)

export const createClient = (data) => createDocument('clients', data)

export const updateClient = (id, data) => updateDocument('clients', id, data)

export const deleteClient = async (id) => {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'clients', id))
  // remove associated user link
  const usersSnap = await getDocs(query(collection(db, 'users'), where('clientId', '==', id)))
  usersSnap.forEach(d => batch.update(d.ref, { clientId: null }))
  await batch.commit()
}

// ─── Directories ─────────────────────────────────────────────────────────────

export const getDirectories = (constraints = []) =>
  getCollection('directories', [orderBy('da', 'desc'), ...constraints])

export const getDirectoryCount = async () => {
  const snap = await getDocs(collection(db, 'directories'))
  return snap.size
}

export const createDirectory = (data) => createDocument('directories', data)
export const updateDirectory = (id, data) => updateDocument('directories', id, data)
export const deleteDirectory = (id) => deleteDocument('directories', id)

// ─── Citations ───────────────────────────────────────────────────────────────

export const getCitationsForClient = (clientId) =>
  getCollection('citations', [
    where('clientId', '==', clientId),
    orderBy('dateSubmitted', 'desc'),
  ])

export const getAllCitations = (constraints = []) =>
  getCollection('citations', [orderBy('dateSubmitted', 'desc'), ...constraints])

export const createCitation = (data) => createDocument('citations', data)
export const updateCitation = (id, data) => updateDocument('citations', id, data)

export const subscribeToCitations = (clientId, callback) =>
  subscribeToCollection(
    'citations',
    [where('clientId', '==', clientId), orderBy('dateSubmitted', 'desc')],
    callback,
  )

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const getJobs = (constraints = []) =>
  getCollection('jobs', [orderBy('createdAt', 'desc'), ...constraints])

export const getJobsForClient = (clientId) =>
  getCollection('jobs', [where('clientId', '==', clientId), orderBy('createdAt', 'desc')])

export const createJob = (data) => createDocument('jobs', data)
export const updateJob = (id, data) => updateDocument('jobs', id, data)

export const appendJobLog = async (jobId, entry) => {
  await updateDoc(doc(db, 'jobs', jobId), {
    logs: arrayUnion({ ...entry, timestamp: new Date().toISOString() }),
    updatedAt: serverTimestamp(),
  })
}

export const subscribeToJob = (jobId, callback) =>
  subscribeToDocument('jobs', jobId, callback)

export const subscribeToJobs = (callback, constraints = []) =>
  subscribeToCollection('jobs', [orderBy('createdAt', 'desc'), ...constraints], callback)

// ─── Packages ────────────────────────────────────────────────────────────────

export const getPackages = () => getCollection('packages', [orderBy('citationCount')])
export const createPackage = (data) => createDocument('packages', data)
export const updatePackage = (id, data) => updateDocument('packages', id, data)
export const deletePackage = (id) => deleteDocument('packages', id)

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUser = (uid) => getDocument('users', uid)

export const getUserOrCreate = async (uid, email) => {
  const user = await getDocument('users', uid)
  if (user) return user

  // Auto-create user document on first login
  await createUser(uid, {
    email,
    role: 'client',
    clientId: null,
  })

  return { id: uid, email, role: 'client', clientId: null }
}

export const createUser = (uid, data) => createDocument('users', data, uid)
export const updateUser = (uid, data) => updateDocument('users', uid, data)
export const getAdminUsers = () => getCollection('users', [where('role', '==', 'admin')])

// ─── Reports / Share Tokens ──────────────────────────────────────────────────

export const createShareToken = (tokenId, data) => createDocument('shareTokens', data, tokenId)
export const getShareToken = (tokenId) => getDocument('shareTokens', tokenId)

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const [clients, packages, jobs, citations] = await Promise.all([
    getDocs(collection(db, 'clients')),
    getDocs(collection(db, 'packages')),
    getDocs(query(collection(db, 'jobs'), where('status', 'in', ['running', 'pending']))),
    getDocs(collection(db, 'citations')),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthCitations = citations.docs.filter(d => {
    const ts = d.data().dateSubmitted?.toDate?.()
    return ts && ts >= monthStart
  })

  return {
    totalClients: clients.size,
    activeJobs: jobs.size,
    citationsThisMonth: thisMonthCitations.length,
    totalCitations: citations.size,
    packagesSold: packages.size,
  }
}
