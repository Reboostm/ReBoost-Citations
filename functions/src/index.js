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

// ─── Utility: Solve ReCAPTCHA with 2Captcha ────────────────────────────────

async function solveCaptchaWith2Captcha(page, jobId, dirName) {
  try {
    // Get sitekey from reCAPTCHA iframe
    const sitekey = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="recaptcha"]')
      if (!iframe) return null
      const src = iframe.src
      const match = src.match(/k=([^&]+)/)
      return match ? match[1] : null
    })

    if (!sitekey) {
      throw new Error('Could not extract reCAPTCHA sitekey')
    }

    await logToJob(jobId, `  → Solving ReCAPTCHA on ${dirName}...`, 'info')

    // Submit to 2Captcha
    const submitResponse = await axios.post('http://2captcha.com/api/upload', {
      method: 'userrecaptcha',
      googlekey: sitekey,
      pageurl: page.url(),
      key: CAPTCHA_KEY,
    })

    if (submitResponse.data.includes('ERROR')) {
      throw new Error(`2Captcha error: ${submitResponse.data}`)
    }

    const captchaId = submitResponse.data.split('|')[1]

    // Poll for result (max 3 minutes)
    let token = null
    let pollCount = 0
    const maxPolls = 180 // 3 minutes with 1 second intervals

    while (!token && pollCount < maxPolls) {
      await new Promise(r => setTimeout(r, 1000))
      pollCount++

      const checkResponse = await axios.get(
        `http://2captcha.com/api/res?key=${CAPTCHA_KEY}&captcha=${captchaId}&json=1`
      )

      const data = checkResponse.data
      if (data.status === 1) {
        token = data.request
        break
      }

      if (data.status === 0 && pollCount % 10 === 0) {
        // Log every 10 seconds
        await logToJob(jobId, `  ⏳ Waiting for CAPTCHA solution...`, 'info')
      }
    }

    if (!token) {
      throw new Error('CAPTCHA solution timeout')
    }

    // Inject token into the page
    await page.evaluate((captchaToken) => {
      // Method 1: Inject into hidden g-recaptcha-response field
      let element = document.getElementById('g-recaptcha-response')
      if (element) {
        element.innerHTML = captchaToken
      }

      // Method 2: Set in window.__grecaptcha__ object
      if (window.__grecaptcha__) {
        window.__grecaptcha__.reset()
        window.__grecaptcha__.execute()
      }

      // Method 3: Dispatch change event
      const event = new Event('change', { bubbles: true })
      if (element) element.dispatchEvent(event)
    }, token)

    await logToJob(jobId, `  ✓ CAPTCHA solved`, 'success')
    return true
  } catch (err) {
    await logToJob(jobId, `  ✗ Failed to solve CAPTCHA: ${err.message}`, 'error')
    return false
  }
}

// ─── Cloud Function: Start Submission Job ──────────────────────────────────

export const startSubmissionJob = https.onCall({ timeoutSeconds: 540 }, async (request) => {
    if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')
    const { data } = request
    const context = request.auth

    const { jobId, clientId, packageId, highCount, mediumCount, lowCount, submittedDirIds } = data

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

      // Get directories by tier, sorted by DA descending (highest quality first)
      const [highDirs, mediumDirs, lowDirs] = await Promise.all([
        db.collection('directories').where('tier', '==', 'high').orderBy('da', 'desc').limit(highCount + 20).get(),
        db.collection('directories').where('tier', '==', 'medium').orderBy('da', 'desc').limit(mediumCount + 20).get(),
        db.collection('directories').where('tier', '==', 'low').orderBy('da', 'desc').limit(lowCount + 20).get(),
      ])

      // Combine and filter out already-submitted directories
      const submittedSet = new Set(submittedDirIds || [])
      const directories = [
        ...highDirs.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, highCount),
        ...mediumDirs.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, mediumCount),
        ...lowDirs.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, lowCount),
      ].filter(d => !submittedSet.has(d.id))

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

            // Determine which email to use based on directory's useCustomerEmail flag
            const emailForSubmission = dir.useCustomerEmail && client.publicEmail
              ? client.publicEmail
              : client.accountEmail

            // Fill common form fields
            const fieldMappings = [
              { sel: ['input[name*="business"], input[name*="company"], input[name*="name"]'], value: client.businessName },
              { sel: ['input[name*="address"], input[name*="street"]'], value: client.address },
              { sel: ['input[name*="city"]'], value: client.city },
              { sel: ['input[name*="state"], input[name*="province"]'], value: client.state },
              { sel: ['input[name*="zip"], input[name*="postal"]'], value: client.zip },
              { sel: ['input[name*="phone"], input[name*="contact"], input[name*="tel"]'], value: client.phone },
              { sel: ['input[name*="email"], input[name*="contact_email"]'], value: emailForSubmission },
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
              if (captchaFrame) {
                if (!CAPTCHA_KEY) {
                  await logToJob(jobId, `  ⚠ CAPTCHA detected on ${dir.name} — no solver configured`, 'warn')
                  const citation = {
                    clientId,
                    directoryId: dir.id,
                    directoryName: dir.name,
                    status: 'needs_manual_review',
                    reason: 'CAPTCHA required (no solver configured)',
                    emailUsed: emailForSubmission,
                    dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
                    liveUrl: null,
                  }
                  await db.collection('citations').add(citation)
                  failed++
                } else {
                  // Try to solve CAPTCHA with 2Captcha
                  const solved = await solveCaptchaWith2Captcha(page, jobId, dir.name)

                  if (solved) {
                    // Small delay to let the CAPTCHA be recognized
                    await new Promise(r => setTimeout(r, 2000))

                    // Click submit
                    await submitBtn.click()
                    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})

                    const citation = {
                      clientId,
                      directoryId: dir.id,
                      directoryName: dir.name,
                      status: 'submitted',
                      emailUsed: emailForSubmission,
                      dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
                      liveUrl: page.url(),
                    }
                    await db.collection('citations').add(citation)
                    await logToJob(jobId, `  ✓ Submitted to ${dir.name} (CAPTCHA solved)`, 'success')
                    submitted++
                  } else {
                    // CAPTCHA solving failed
                    const citation = {
                      clientId,
                      directoryId: dir.id,
                      directoryName: dir.name,
                      status: 'needs_manual_review',
                      reason: 'CAPTCHA solving failed',
                      emailUsed: emailForSubmission,
                      dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
                      liveUrl: null,
                    }
                    await db.collection('citations').add(citation)
                    failed++
                  }
                }
              } else {
                await submitBtn.click()
                await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})

                const citation = {
                  clientId,
                  directoryId: dir.id,
                  directoryName: dir.name,
                  status: 'submitted',
                  emailUsed: emailForSubmission,
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
              emailUsed: emailForSubmission,
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

// ─── Setup Helper: Make User Admin ────────────────────────────────────────

export const makeUserAdmin = https.onCall(async (request) => {
  const userId = request.auth?.uid
  if (!userId) throw new https.HttpsError('unauthenticated', 'Not authenticated')

  const { targetUserId } = request.data
  if (!targetUserId) throw new https.HttpsError('invalid-argument', 'targetUserId required')

  // Make the user admin
  await db.collection('users').doc(targetUserId).set({ role: 'admin' }, { merge: true })
  return { success: true }
})

// ─── Email Verification Automation ────────────────────────────────────────────

export const verifyPendingEmails = https.onCall(async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Not authenticated')

  // Check for IMAP credentials
  const gmailPassword = process.env.GMAIL_APP_PASSWORD
  const gmailAddress = process.env.GMAIL_ADDRESS || 'reboostcitations@gmail.com'

  if (!gmailPassword) {
    throw new https.HttpsError('failed-precondition', 'Gmail app password not configured')
  }

  try {
    const Imap = require('imap')
    const { simpleParser } = require('mailparser')

    // Connect to Gmail IMAP
    const imap = new Imap({
      user: gmailAddress,
      password: gmailPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
    })

    let verifiedCount = 0
    let processedCount = 0

    // Search for unread emails with 'verify' or 'confirm' in subject
    const searchCriteria = ['UNSEEN', ['HEADER', 'SUBJECT', 'verify']]

    const openInbox = (cb) => {
      imap.openBox('INBOX', false, cb)
    }

    imap.openBox('INBOX', false, async (err, box) => {
      if (err) throw err

      // Find emails with verify/confirm
      imap.search(['UNSEEN', ['OR', ['HEADER', 'SUBJECT', 'verify'], ['HEADER', 'SUBJECT', 'confirm']]], async (err, results) => {
        if (err) throw err

        if (!results || results.length === 0) {
          imap.end()
          return { success: true, verified: 0, processed: 0, message: 'No pending verification emails' }
        }

        for (const id of results) {
          try {
            const f = imap.fetch(id, { bodies: '' })

            f.on('message', (msg, seqno) => {
              simpleParser(msg, async (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err)
                  return
                }

                processedCount++

                try {
                  // Extract verification link
                  const verifyLink = parsed.text.match(/https?:\/\/[^\s]+verify[^\s]*/i) ||
                    parsed.text.match(/https?:\/\/[^\s]+confirm[^\s]*/i)

                  if (!verifyLink) {
                    console.log('No verification link found in email')
                    return
                  }

                  // Extract client name from email to/cc
                  const recipientMatch = parsed.to?.text.match(/reboostcitations\+(\w+)@/i)
                  const clientName = recipientMatch ? recipientMatch[1] : 'unknown'

                  // Visit the verification link with Playwright
                  const browser = await chromium.launch({ headless: true })
                  const context = await browser.createBrowserContext()
                  const page = await context.newPage()

                  page.setDefaultTimeout(30000)

                  try {
                    await page.goto(verifyLink[0], { waitUntil: 'networkidle' })

                    // Wait a bit for verification to process
                    await new Promise(r => setTimeout(r, 2000))

                    // Find citation in Firestore and mark verified
                    const citationsSnap = await db
                      .collection('citations')
                      .where('directoryName', '==', parsed.from?.text)
                      .limit(1)
                      .get()

                    if (!citationsSnap.empty) {
                      await citationsSnap.docs[0].ref.update({
                        verified: true,
                        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                      })
                      verifiedCount++
                    }
                  } catch (pageErr) {
                    console.error('Error verifying link:', pageErr)
                  } finally {
                    await context.close()
                    await browser.close()
                  }
                } catch (err) {
                  console.error('Error processing email:', err)
                }
              })
            })

            f.on('error', (err) => {
              console.error('Error fetching email:', err)
            })
          } catch (err) {
            console.error('Error processing result:', err)
          }
        }

        // Close IMAP connection
        imap.end()
      })
    })

    imap.openBox('INBOX', false, (err) => {
      if (err) throw err
    })

    imap.on('ready', () => {
      openInbox((err) => {
        if (err) throw err
      })
    })

    // Wait for process to complete
    await new Promise((resolve, reject) => {
      imap.on('end', () => {
        resolve()
      })
      imap.on('error', reject)
    })

    return {
      success: true,
      verified: verifiedCount,
      processed: processedCount,
      message: `Verified ${verifiedCount} citations from ${processedCount} emails`,
    }
  } catch (err) {
    console.error('Email verification error:', err)
    throw new https.HttpsError('internal', `Email verification failed: ${err.message}`)
  }
})

// ─── Create User with Optional Client ────────────────────────────────────────

export const createUserWithClient = https.onCall(async (request) => {
  const { email, password, role = 'client', businessData } = request.data

  // Validate inputs
  if (!email || !password) {
    throw new https.HttpsError('invalid-argument', 'Email and password required')
  }

  if (password.length < 8) {
    throw new https.HttpsError('invalid-argument', 'Password must be at least 8 characters')
  }

  if (!['admin', 'client'].includes(role)) {
    throw new https.HttpsError('invalid-argument', 'Role must be admin or client')
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
    })

    let clientId = null

    // 2. If businessData provided, create client and generate dummy email
    if (businessData && role === 'client') {
      // Generate dummy email: reboostcitations+companyname@gmail.com
      const baseName = businessData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
      let dummyEmail = `reboostcitations+${baseName}@gmail.com`
      let counter = 1

      // Check if dummy email exists and increment if needed
      while (true) {
        const existing = await db
          .collection('clients')
          .where('dummyEmail', '==', dummyEmail)
          .limit(1)
          .get()

        if (existing.empty) break

        dummyEmail = `reboostcitations+${baseName}${counter}@gmail.com`
        counter++
      }

      // Create client document
      const clientRef = await db.collection('clients').add({
        ...businessData,
        dummyEmail,
        dummyEmailPassword: 'reboostcitations123!',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      clientId = clientRef.id
    }

    // 3. Create Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      email,
      role,
      clientId: clientId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      userId: userRecord.uid,
      clientId: clientId,
      email,
      dummyEmail: clientId ? (businessData ? `reboostcitations+${businessData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com` : null) : null,
    }
  } catch (err) {
    // Handle specific Firebase Auth errors
    if (err.code === 'auth/email-already-exists') {
      throw new https.HttpsError('already-exists', 'Email already in use')
    }
    if (err.code === 'auth/invalid-email') {
      throw new https.HttpsError('invalid-argument', 'Invalid email address')
    }
    if (err.code === 'auth/weak-password') {
      throw new https.HttpsError('invalid-argument', 'Password is too weak')
    }

    throw new https.HttpsError('internal', err.message)
  }
})
