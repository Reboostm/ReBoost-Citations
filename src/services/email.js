import { getDocument } from './firestore'

// Get Resend API key and sender email from settings
const getEmailConfig = async () => {
  try {
    const settings = await getDocument('settings', 'global')
    return {
      resendApiKey: settings?.resendApiKey,
      senderEmail: settings?.resendSenderEmail || 'support@reboostcitations.com',
    }
  } catch (err) {
    console.error('Error loading email config:', err)
    return null
  }
}

// Email Templates
const emailTemplates = {
  welcomeClient: ({ email, password, businessName }) => ({
    subject: `Welcome to ReBoost Citations, ${businessName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; text-align: center; margin-bottom: 10px;">Welcome to ReBoost Citations!</h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 30px;">We're excited to have you on board.</p>

        <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 15px 0; color: #374151;">
            <strong>Hi ${businessName},</strong>
          </p>
          <p style="margin: 0 0 15px 0; color: #374151; line-height: 1.6;">
            You've made a great choice! We're thrilled to help you grow your business through our citation management service.
            By being here and taking these first steps, you're already on your way to building a stronger online presence.
          </p>
          <p style="margin: 0 0 15px 0; color: #374151; line-height: 1.6;">
            We're confident that the work you do here will pay off in increased visibility and customer trust across the web.
          </p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Login Credentials</p>
          <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>Email:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${email}</code></p>
          <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">123456</code></p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">💡 You can change your password after logging in.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.reboostcitations.com/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Login to Your Dashboard
          </a>
        </div>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          Once you're logged in, you'll see a <strong>"Start Here"</strong> button. Click it to complete your business profile,
          and we'll automatically start submitting your information to high-quality citation sites across the web.
        </p>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          Have questions? Need help? We're here for you. Just click the blue help button in your dashboard anytime.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          ReBoost Citations © 2024. We're here to help your business grow.
        </p>
      </div>
    `,
  }),

  welcomeStaff: ({ email, password }) => ({
    subject: 'Welcome to ReBoost Citations - Staff Access',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; text-align: center;">Welcome to the Team! 👋</h1>

        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Staff Login</p>
          <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>Email:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${email}</code></p>
          <p style="margin: 0 0 8px 0; color: #1f2937;"><strong>Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">123456</code></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.reboostcitations.com/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Login
          </a>
        </div>

        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          Remember to change your password on first login.
        </p>
      </div>
    `,
  }),

  jobStarted: ({ businessName, jobCount, citationCount }) => ({
    subject: `Citations Submission Started for ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937;">🚀 We're Getting Started!</h1>

        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #166534;">
            <strong>Your citation submission job has started!</strong>
          </p>
          <p style="margin: 0; color: #166534; line-height: 1.6;">
            We're now automatically submitting your business information to ${jobCount} high-quality citation sites.
            This typically takes a few hours, but you can track progress in real-time.
          </p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">This Job Includes</p>
          <p style="margin: 0; color: #1f2937; font-size: 18px; font-weight: bold;">${citationCount} Citations</p>
          <p style="margin: 0; color: #6b7280; font-size: 12px;">Across our top-tier directory network</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.reboostcitations.com/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Progress
          </a>
        </div>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          You can check the live progress of your submissions anytime in your dashboard.
          Most submissions complete within 24-48 hours.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px;">
          Questions? We're here to help. Reply to this email or contact us through your dashboard.
        </p>
      </div>
    `,
  }),

  jobCompleted: ({ businessName, liveCount, dashboardUrl }) => ({
    subject: `🎉 Your Citations Are Live - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669; text-align: center;">🎉 Congratulations!</h1>
        <p style="color: #6b7280; text-align: center; font-size: 18px; margin-bottom: 30px;">Your citations are now live!</p>

        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 15px 0; color: #166534; line-height: 1.6;">
            Your business is now appearing on major citation sites across the web.
            This is a huge step forward for your online visibility and reputation!
          </p>
          <p style="margin: 0; color: #059669; font-size: 24px; font-weight: bold;">
            ${liveCount} Citations Live
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Your Listings
          </a>
        </div>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          <strong>What's next?</strong> Your citations help with local SEO and customer trust.
          You should start seeing improved visibility in local search results and Google Maps within the next few days.
        </p>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          Have questions about your results? Want to expand to more sites?
          We're here to help! Just reach out anytime.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Thanks for choosing ReBoost Citations. We're committed to your success!
        </p>
      </div>
    `,
  }),

  jobFailed: ({ businessName, failureCount, supportUrl }) => ({
    subject: `Action Needed - Some Citations Couldn't Be Submitted`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">We Need Your Help</h1>

        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #991b1b;">
            <strong>We encountered issues with ${failureCount} citations</strong>
          </p>
          <p style="margin: 0; color: #991b1b; line-height: 1.6;">
            While most of your submissions were successful, some ran into issues.
            This is usually easy to fix!
          </p>
        </div>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          Common reasons include:
        </p>
        <ul style="color: #6b7280; line-height: 1.8; margin: 0 0 20px 20px;">
          <li>Duplicate listings already existing</li>
          <li>Missing required information</li>
          <li>Site-specific requirements</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${supportUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Contact Support
          </a>
        </div>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          Our team is happy to help resolve these issues. Reply to this email or click the button above to get in touch.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px;">
          We're here to ensure your success!
        </p>
      </div>
    `,
  }),

  passwordReset: ({ resetLink }) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937;">Reset Your Password</h1>

        <p style="color: #6b7280; line-height: 1.6; margin: 20px 0;">
          Click the link below to reset your password. This link expires in 1 hour.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </div>

        <p style="color: #6b7280; font-size: 12px;">
          If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  }),
}

// Send email function (would use Resend API)
export const sendEmail = async ({ to, templateKey, data }) => {
  const config = await getEmailConfig()

  if (!config?.resendApiKey) {
    console.warn('Resend API key not configured. Email would be:', { to, templateKey, data })
    return { success: false, message: 'Resend not configured' }
  }

  const template = emailTemplates[templateKey]
  if (!template) {
    console.error('Email template not found:', templateKey)
    return { success: false, message: 'Template not found' }
  }

  const { subject, html } = template(data)

  try {
    // This would be called via Cloud Function to use Resend API safely
    // For now, we're returning the email data to be sent via Cloud Function
    return {
      success: true,
      email: {
        to,
        from: config.senderEmail,
        subject,
        html,
      },
    }
  } catch (err) {
    console.error('Error sending email:', err)
    return { success: false, message: err.message }
  }
}

export default emailTemplates
