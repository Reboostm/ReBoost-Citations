export const CITATION_STATUSES = {
  PENDING:              { label: 'Pending',              color: 'yellow' },
  SUBMITTED:            { label: 'Submitted',            color: 'blue'   },
  LIVE:                 { label: 'Live',                 color: 'green'  },
  FAILED:               { label: 'Failed',               color: 'red'    },
  NEEDS_MANUAL_REVIEW:  { label: 'Needs Manual Review',  color: 'orange' },
  VERIFICATION_SENT:    { label: 'Verification Sent',    color: 'purple' },
  DUPLICATE:            { label: 'Duplicate (Skipped)',  color: 'gray'   },
}

export const JOB_STATUSES = {
  PENDING:   'pending',
  RUNNING:   'running',
  PAUSED:    'paused',
  COMPLETED: 'completed',
  FAILED:    'failed',
}

export const DIRECTORY_TIERS = {
  HIGH:   { label: 'High Authority',   color: 'green',  minDA: 50 },
  MEDIUM: { label: 'Medium Authority', color: 'yellow', minDA: 20 },
  LOW:    { label: 'Low Authority',    color: 'gray',   minDA: 0  },
}

export const SUBMISSION_TYPES = {
  WEB_FORM: 'web_form',
  API:      'api',
  MANUAL:   'manual',
}

export const BUSINESS_CATEGORIES = [
  'General Business',
  'Legal & Law',
  'Medical & Health',
  'Dental',
  'Home Services',
  'Plumbing',
  'HVAC',
  'Electrical',
  'Roofing',
  'Landscaping',
  'Cleaning Services',
  'Restaurant & Food',
  'Automotive',
  'Real Estate',
  'Financial Services',
  'Insurance',
  'Education',
  'Beauty & Salon',
  'Fitness & Gym',
  'Pet Services',
  'Retail',
  'Technology',
  'Marketing & Advertising',
  'Construction',
  'Photography',
  'Event Planning',
  'Travel & Tourism',
  'Non-Profit',
  'Other',
]

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]
