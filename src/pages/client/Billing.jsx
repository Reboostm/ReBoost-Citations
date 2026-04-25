import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getClient, getDocument, getPackages } from '@/services/firestore'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/utils/helpers'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/services/firebase'
import toast from 'react-hot-toast'
import { ArrowRight, Check, AlertCircle } from 'lucide-react'

export default function Billing() {
  const { userProfile } = useAuth()
  const [client, setClient] = useState(null)
  const [currentPkg, setCurrentPkg] = useState(null)
  const [packages, setPackages] = useState([])
  const [upgradeOptions, setUpgradeOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!userProfile?.clientId) return

      try {
        const [clientData, allPackages] = await Promise.all([
          getClient(userProfile.clientId),
          getPackages(),
        ])

        setClient(clientData)

        // Get current package
        if (clientData.packageId) {
          const pkg = await getDocument('packages', clientData.packageId)
          setCurrentPkg(pkg)

          // Find upgrade options
          const upgrades = allPackages.filter(
            p =>
              p.packageType === 'citation' &&
              p.upgradeFromPackageId === clientData.packageId
          )
          setUpgradeOptions(upgrades)
        }

        // Get all citation packages for display
        const citationPackages = allPackages.filter(p => p.packageType === 'citation')
        setPackages(citationPackages)
      } catch (err) {
        console.error('Error loading billing data:', err)
        toast.error('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userProfile])

  const handleCheckout = async (packageId) => {
    if (!userProfile?.clientId) {
      toast.error('No client profile found')
      return
    }

    setCheckingOut(packageId)
    try {
      const createCheckoutSession = httpsCallable(
        functions,
        'createCheckoutSession'
      )

      const response = await createCheckoutSession({
        clientId: userProfile.clientId,
        packageId: packageId,
        isUpgrade: currentPkg?.id && currentPkg.id !== packageId,
      })

      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error(err.message || 'Failed to start checkout')
    } finally {
      setCheckingOut(null)
    }
  }

  if (loading) return <PageLoader />

  if (!client) {
    return (
      <div className="p-8 text-center text-gray-500">
        No client profile found. Please contact support.
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Packages</h1>
        <p className="text-gray-600">
          Manage your subscription and upgrade your citation package
        </p>
      </div>

      {/* Current Package */}
      {currentPkg && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Current Plan</h2>
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{currentPkg.name}</h3>
                <p className="text-gray-600 mt-1">
                  {currentPkg.citationCount.toLocaleString()} citations included
                </p>
              </div>
              <Badge color="green">Active</Badge>
            </div>

            <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-lg p-4 mb-6 border border-brand-100">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium uppercase mb-1">
                    Monthly Price
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(currentPkg.price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium uppercase mb-1">
                    Citations
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentPkg.citationCount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium uppercase mb-1">
                    Status
                  </p>
                  <p className="text-2xl font-bold text-green-600">Active ✓</p>
                </div>
              </div>
            </div>

            {currentPkg.features && currentPkg.features.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-3">Includes:</p>
                <ul className="space-y-2">
                  {currentPkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Upgrade Options or All Packages */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {upgradeOptions.length > 0 ? '⬆️ Available Upgrades' : '📦 All Packages'}
        </h2>

        {upgradeOptions.length > 0 ? (
          // Show only upgrade options
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upgradeOptions.map(pkg => (
              <Card key={pkg.id} className={`relative overflow-hidden ${
                pkg.highlighted ? 'ring-2 ring-brand-500 shadow-lg' : ''
              }`}>
                {pkg.highlighted && (
                  <div className="absolute top-0 inset-x-0 bg-amber-400 text-amber-900 text-xs font-bold text-center py-1 tracking-wide">
                    RECOMMENDED
                  </div>
                )}
                <div className={`${pkg.highlighted ? 'pt-8' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {pkg.citationCount.toLocaleString()} citations
                      </p>
                    </div>
                    {pkg.highlighted && (
                      <Badge color="purple">Best Value</Badge>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-600 uppercase mb-1">
                      Total Price
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(pkg.price)}
                    </p>
                    {pkg.upgradePrice && (
                      <p className="text-sm text-gray-600 mt-2">
                        Additional cost: {formatCurrency(pkg.upgradePrice)}
                      </p>
                    )}
                  </div>

                  {pkg.features && pkg.features.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      <ul className="space-y-2">
                        {pkg.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleCheckout(pkg.id)}
                    loading={checkingOut === pkg.id}
                  >
                    Upgrade Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Show all packages
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden ${
                  pkg.highlighted ? 'ring-2 ring-brand-500 shadow-lg' : ''
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute top-0 inset-x-0 bg-amber-400 text-amber-900 text-xs font-bold text-center py-1 tracking-wide">
                    MOST POPULAR
                  </div>
                )}
                <div className={`${pkg.highlighted ? 'pt-8' : ''}`}>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {formatCurrency(pkg.price)}
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    {pkg.citationCount.toLocaleString()} citations
                  </p>

                  {pkg.features && pkg.features.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      <ul className="space-y-2">
                        {pkg.features.slice(0, 3).map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-700"
                          >
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    variant={pkg.highlighted ? 'primary' : 'secondary'}
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleCheckout(pkg.id)}
                    loading={checkingOut === pkg.id}
                    disabled={currentPkg?.id === pkg.id}
                  >
                    {currentPkg?.id === pkg.id ? (
                      'Current Plan'
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Questions?</h3>
            <p className="text-sm text-blue-800">
              If you have questions about which package is right for you or need
              help with your current plan, please reach out to our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
