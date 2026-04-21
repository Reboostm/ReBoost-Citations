import { https, setGlobalOptions } from 'firebase-functions'
import admin from 'firebase-admin'
import { chromium } from 'playwright'
import axios from 'axios'

setGlobalOptions({ region: 'us-central1', memory: '2GB' })

admin.initializeApp()
const db = admin.firestore()

const CAPTCHA_KEY = process.env.CAPTCHA_API_KEY
const CSE_KEY     = process.env.GOOGLE_CSE_KEY
const CSE_ID      = process.env.GOOGLE_CSE_ID

// ─── Utility: Log entry to job ─────────────────────────────────────────────

async function logToJob(jobId, message, type = 'info') {
  const entry = {
    type,
    message,
    timestamp: new Date().toISOString(),
  }
  await db.collection('jobs').doc(jobId).update({
    logs: admin.firestore.FieldValue.arrayUnion(entry),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// ─── Cloud Function: Start Submission Job ──────────────────────────────────

export const startSubmissionJob = https.onCall({ timeoutSeconds: 540 }, async (request) => {
    if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')
    const { data } = request
    const context = request.auth

    const { jobId, clientId, packageId, tier } = data

    try {
      // Get job, client, and package details
      const [jobSnap, clientSnap, pkgSnap] = await Promise.all([
        db.collection('jobs').doc(jobId).get(),
        db.collection('clients').doc(clientId).get(),
        db.collection('packages').doc(packageId).get(),
      ])

      const job = jobSnap.data()
      const client = clientSnap.data()
      const pkg = pkgSnap.data()

      if (!client) throw new Error('Client not found')
      if (!pkg) throw new Error('Package not found')

      // Update job status
      await db.collection('jobs').doc(jobId).update({ status: 'running' })
      await logToJob(jobId, 'Starting submission job...', 'info')

      // Get directories to submit based on tier
      let query = db.collection('directories')
      if (tier && tier !== 'all') {
        query = query.where('tier', '==', tier)
      }
      const dirSnap = await query.limit(pkg.citationCount + 50).get()
      const directories = dirSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      if (directories.length === 0) {
        await logToJob(jobId, 'No directories found for submission', 'warn')
        await db.collection('jobs').doc(jobId).update({ status: 'completed', progress: 0 })
        return { success: true, submitted: 0 }
      }

      await logToJob(jobId, `Found ${directories.length} directories for submission`, 'info')

      // Launch browser
      const browser = await chromium.launch({ headless: true })
      const context = await browser.createBrowserContext()
      let submitted = 0
      let failed = 0

      for (let i = 0; i < Math.min(directories.length, pkg.citationCount + 20); i++) {
        const dir = directories[i]

        try {
          // Check job pause status
          const currentJob = await db.collection('jobs').doc(jobId).get()
          if (currentJob.data().status === 'paused') {
            await logToJob(jobId, 'Job paused by user', 'warn')
            break
          }

          const page = await context.newPage()
          page.setDefaultTimeout(30000)
          page.setDefaultNavigationTimeout(30000)

          try {
            // Navigate to submission form
            if (!dir.submissionUrl) {
              await logToJob(jobId, `⊘ ${dir.name} — No submission URL`, 'warn')
              failed++
              continue
            }

            await logToJob(jobId, `→ Submitting to ${dir.name}...`, 'info')
            await page.goto(dir.submissionUrl, { waitUntil: 'networkidle' })

            // Fill common form fields
            const fieldMappings = [
              { sel: ['input[name*="business"], input[name*="company"], input[name*="name"]'], value: client.businessName },
              { sel: ['input[name*="address"], input[name*="street"]'], value: client.address },
              { sel: ['input[name*="city"]'], value: client.city },
              { sel: ['input[name*="state"], input[name*="province"]'], value: client.state },
              { sel: ['input[name*="zip"], input[name*="postal"]'], value: client.zip },
              { sel: ['input[name*="phone"], input[name*="contact"], input[name*="tel"]'], value: client.phone },
              { sel: ['input[name*="email"], input[name*="contact_email"]'], value: client.accountEmail },
              { sel: ['input[name*="website"], input[name*="url"]'], value: client.website },
            ]

            for (const mapping of fieldMappings) {
              for (const selector of mapping.sel) {
                const elem = await page.$(selector)
                if (elem) {
                  await elem.fill(mapping.value)
                  break
                }
              }
            }

            // Look for submit button
            const submitBtn = await page.$('button[type="submit"], button:has-text("Submit"), input[type="submit"]')
            if (submitBtn) {
              // Check for CAPTCHA
              const captchaFrame = await page.$('iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"]')
              if (captchaFrame && CAPTCHA_KEY) {
                await logToJob(jobId, `  ⚠ CAPTCHA detected on ${dir.name} — flagging for manual review`, 'warn')
                const citation = {
                  clientId,
                  directoryId: dir.id,
                  directoryName: dir.name,
                  status: 'needs_manual_review',
                  reason: 'CAPTCHA required',
                  dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
                  liveUrl: null,
                }
                await db.collection('citations').add(citation)
                failed++
              } else {
                await submitBtn.click()
                await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})

                const citation = {
                  clientId,
                  directoryId: dir.id,
                  directoryName: dir.name,
                  status: 'submitted',
                  dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
                  liveUrl: page.url(),
                }
                await db.collection('citations').add(citation)
                await logToJob(jobId, `  ✓ Submitted to ${dir.name}`, 'success')
                submitted++
              }
            } else {
              await logToJob(jobId, `  ⚠ Could not find submit button on ${dir.name}`, 'warn')
              failed++
            }
          } catch (pageErr) {
            await logToJob(jobId, `  ✗ Error submitting to ${dir.name}: ${pageErr.message}`, 'error')
            const citation = {
              clientId,
              directoryId: dir.id,
              directoryName: dir.name,
              status: 'failed',
              error: pageErr.message,
              dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
            }
            await db.collection('citations').add(citation)
            failed++
          } finally {
            await page.close()
          }

          // Update progress
          await db.collection('jobs').doc(jobId).update({
            progress: submitted + failed,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })

          // Rate limiting — 2 second delay between submissions
          await new Promise(r => setTimeout(r, 2000))
        } catch (err) {
          await logToJob(jobId, `Error processing directory ${dir.name}: ${err.message}`, 'error')
        }
      }

      await browser.close()
      await db.collection('jobs').doc(jobId).update({
        status: 'completed',
        progress: submitted + failed,
      })
      await logToJob(jobId, `Job completed! Submitted to ${submitted} directories, ${failed} failures/skipped.`, 'success')

      return { success: true, submitted, failed }
    } catch (err) {
      await logToJob(jobId, `Fatal error: ${err.message}`, 'error')
      await db.collection('jobs').doc(jobId).update({ status: 'failed' })
      throw new https.HttpsError('internal', err.message)
    }
  })

// ─── Cloud Function: Pause Job ────────────────────────────────────────────

export const pauseSubmissionJob = https.onCall(async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')
  const { data } = request
  const { jobId } = data
  await db.collection('jobs').doc(jobId).update({ status: 'paused' })
  return { success: true }
})

// ─── Cloud Function: Resume Job ───────────────────────────────────────────

export const resumeSubmissionJob = https.onCall(async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')
  const { data } = request
  const { jobId } = data
  await db.collection('jobs').doc(jobId).update({ status: 'running' })
  // Optionally re-trigger the submission logic for remaining directories
  return { success: true }
})

// ─── Cloud Function: Citation Audit ───────────────────────────────────────

export const runCitationAudit = https.onCall(async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')
  const { data } = request

  const { clientId } = data
  const client = (await db.collection('clients').doc(clientId).get()).data()

  if (!client || !CSE_KEY || !CSE_ID) {
    throw new https.HttpsError('failed-precondition', 'Client not found or Google CSE not configured')
  }

  try {
    const queries = [
      `"${client.businessName}" "${client.phone}"`,
      `"${client.businessName}" "${client.address}"`,
    ]

    const results = []
    for (const q of queries) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${CSE_KEY}&cx=${CSE_ID}&q=${encodeURIComponent(q)}&num=10`
      const res = await axios.get(url)
      if (res.data.items) {
        res.data.items.forEach(item => {
          if (!results.find(r => r.link === item.link)) {
            results.push({ title: item.title, link: item.link, snippet: item.snippet })
          }
        })
      }
    }

    return { success: true, citations: results }
  } catch (err) {
    throw new https.HttpsError('internal', err.message)
  }
})

// ─── Cloud Function: Generate PDF Report ──────────────────────────────────

export const generatePdfReport = https.onCall({ timeoutSeconds: 300 }, async (request) => {
    if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')
    const { data } = request

    const { clientId } = data

    try {
      const [client, citations] = await Promise.all([
        db.collection('clients').doc(clientId).get(),
        db.collection('citations').where('clientId', '==', clientId).get(),
      ])

      if (!client.exists) {
        throw new Error('Client not found')
      }

      // Generate PDF here (in production, use a library like pdfkit)
      // For now, just return success
      return {
        success: true,
        reportUrl: `https://storage.googleapis.com/.../${clientId}-report.pdf`,
        citationCount: citations.size,
      }
    } catch (err) {
      throw new https.HttpsError('internal', err.message)
    }
  })
