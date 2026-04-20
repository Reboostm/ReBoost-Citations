import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

export const uploadLogo = (clientId, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()
    const storageRef = ref(storage, `logos/${clientId}/logo.${ext}`)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      snap => onProgress?.((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve(url)
      },
    )
  })
}

export const deleteLogo = async (clientId) => {
  try {
    const storageRef = ref(storage, `logos/${clientId}/logo`)
    await deleteObject(storageRef)
  } catch {
    // File may not exist — silently ignore
  }
}
