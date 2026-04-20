import { useState } from 'react'
import { Search, CheckCircle, XCircle, AlertCircle, ExternalLink, SkipForward } from 'lucide-react'
import { getClients } from '@/services/firestore'
import { useEffect } from 'react'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'
import toast from 'react-hot-toast'

const CSE_API_KEY  = import.meta.env.VITE_GOOGLE_CSE_API_KEY
const CSE_ENGINE_ID = import.meta.env.VITE_GOOGLE_CSE_ENGINE_ID

async function searchCitations(businessName, phone, address) {
  if (!CSE_API_KEY || !CSE_ENGINE_ID) {
    throw new Error('Google Custom Search API not configured — add VITE_GOOGLE_CSE_API_KEY and VITE_GOOGLE_CSE_ENGINE_ID to your .env')
  }

  const queries = [
    `"${businessName}" "${phone}"`,
    `"${businessName}" "${address}"`,
  ]

  const results = []

  for (const q of queries) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${CSE_API_KEY}&cx=${CSE_ENGINE_ID}&q=${encodeURIComponent(q)}&num=10`
    const res  = await fetch(url)
    const data = await res.json()
    if (data.items) {
      data.items.forEach(item => {
        if (!results.find(r => r.link === item.link)) {
          results.push({
            title:   item.title,
            link:    item.link,
            snippet: item.snippet,
            domain:  new URL(item.link).hostname.replace('www.', ''),
          })
        }
      })
    }
  }

  return results
}

function classifyResult(result) {
  const knownDirectories = [
    'yelp.com', 'yellowpages.com', 'bbb.org', 'angieslist.com', 'houzz.com',
    'foursquare.com', 'mapquest.com', 'citysearch.com', 'manta.com', 'superpages.com',
    'loc8nearme.com', 'hotfrog.com', 'kudzu.com', 'n49.com', 'brownbook.net',
    'cylex.us', 'chamberofcommerce.com', 'merchantcircle.com', 'tupalo.com', 'cybo.com',
  ]
  if (knownDirectories.some(d => result.domain.includes(d))) return 'verified'
  return 'unverified'
}

export default function CitationAudit() {
  const [clients, setClients]   = useState([])
  const [clientId, setClientId] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults]   = useState([])
  const [searched, setSearched] = useState(false)
  const [skipped, setSkipped]   = useState(new Set())

  useEffect(() => { getClients().then(setClients) }, [])

  const client = clients.find(c => c.id === clientId)

  const runAudit = async () => {
    if (!client) return
    setSearching(true)
    setResults([])
    setSearched(false)
    try {
      const found = await searchCitations(client.businessName, client.phone, client.address)
      const classified = found.map(r => ({ ...r, status: classifyResult(r) }))
      setResults(classified)
      setSearched(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSearching(false)
    }
  }

  const toggleSkip = (link) => {
    setSkipped(prev => {
      const next = new Set(prev)
      next.has(link) ? next.delete(link) : next.add(link)
      return next
    })
  }

  const verifiedCount   = results.filter(r => r.status === 'verified').length
  const unverifiedCount = results.filter(r => r.status === 'unverified').length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Citation Audit"
        subtitle="Find existing citations before submitting to avoid duplicates"
      />

      {/* Controls */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Select
              label="Select Client"
              placeholder="Choose a client…"
              options={clients.map(c => ({ value: c.id, label: c.businessName }))}
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            />
          </div>
          {client && (
            <div className="text-sm text-gray-500 hidden sm:block">
              <p><strong>Search:</strong> "{client.businessName}" + phone / address</p>
            </div>
          )}
          <Button onClick={runAudit} loading={searching} disabled={!clientId}>
            <Search className="w-4 h-4" /> Run Audit
          </Button>
        </div>

        {!CSE_API_KEY && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>⚠ Google CSE not configured.</strong> Add <code>VITE_GOOGLE_CSE_API_KEY</code> and <code>VITE_GOOGLE_CSE_ENGINE_ID</code> to your <code>.env</code> file to enable live citation search.
          </div>
        )}
      </Card>

      {/* Results */}
      {searched && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{results.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Found</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Known Directories</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-500">{unverifiedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Other Mentions</p>
            </div>
          </div>

          {results.length === 0 ? (
            <Card>
              <p className="text-center text-gray-500 py-8">No existing citations found for this business.</p>
            </Card>
          ) : (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <CardTitle>Found Citations</CardTitle>
                <p className="text-sm text-gray-500">{skipped.size} marked to skip</p>
              </div>
              <div className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-start gap-4 px-5 py-4 ${skipped.has(r.link) ? 'opacity-50 bg-gray-50' : ''}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {r.status === 'verified'
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <AlertCircle className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-gray-900 truncate">{r.title}</p>
                        <Badge color={r.status === 'verified' ? 'green' : 'gray'}>{r.status}</Badge>
                        {skipped.has(r.link) && <Badge color="gray">Skipped</Badge>}
                      </div>
                      <p className="text-xs text-brand-600 truncate mb-1">{r.domain}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{r.snippet}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={r.link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => toggleSkip(r.link)}
                        className={`p-1.5 rounded-lg transition-colors ${skipped.has(r.link) ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-400 hover:text-amber-600'}`}
                        title={skipped.has(r.link) ? 'Un-skip' : 'Skip this directory in submission queue'}
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
