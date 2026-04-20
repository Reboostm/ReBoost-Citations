import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export const startSubmissionJob = httpsCallable(functions, 'startSubmissionJob')
export const pauseSubmissionJob  = httpsCallable(functions, 'pauseSubmissionJob')
export const resumeSubmissionJob = httpsCallable(functions, 'resumeSubmissionJob')
export const runCitationAudit    = httpsCallable(functions, 'runCitationAudit')
export const generatePdfReport   = httpsCallable(functions, 'generatePdfReport')
