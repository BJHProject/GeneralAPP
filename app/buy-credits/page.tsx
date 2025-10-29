"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DiamondIcon } from "@/components/ui/diamond-icon"
import { Loader2, CheckCircle2, Coins } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"

const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', price: 5, credits: 5000, popular: false },
  { id: 'popular', name: 'Popular', price: 9.99, credits: 10000, popular: true },
  { id: 'pro', name: 'Pro', price: 19.99, credits: 20000, popular: false },
  { id: 'elite', name: 'Elite', price: 49.99, credits: 50000, popular: false },
]

export default function BuyCreditsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        router.replace('/buy-credits')
      }, 5000)
    }
  }, [searchParams, router])

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    setLoading(packageId)

    try {
      const response = await fetch('/api/crypto/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })

      const data = await response.json()

      if (data.success && data.invoiceUrl) {
        window.location.href = data.invoiceUrl
      } else {
        throw new Error(data.error || 'Failed to create payment')
      }
    } catch (error) {
      console.error('Failed to create payment:', error)
      alert('Failed to create payment. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {showSuccess && (
            <div className="mb-8 p-6 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Your credits will be added to your account shortly.
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Coins className="w-10 h-10 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Buy Credits
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purchase credits with cryptocurrency to generate amazing images and videos. All payments are processed securely through NOWPayments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative p-6 border-2 transition-all hover:scale-105 hover:shadow-2xl ${
                  pkg.popular
                    ? 'border-primary bg-gradient-to-br from-primary/5 to-purple-500/5'
                    : 'border-primary/10 bg-gradient-to-br from-card/50 to-muted/30'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-purple-500 rounded-full text-xs font-semibold text-white shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold">{pkg.name}</h3>

                  <div className="py-4">
                    <div className="text-4xl font-extrabold mb-2">
                      ${pkg.price}
                    </div>
                    <div className="text-sm text-muted-foreground">USD in crypto</div>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 rounded-lg">
                    <DiamondIcon className="w-5 h-5 text-primary" />
                    <span className="text-xl font-semibold">
                      {pkg.credits.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">credits</span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 pt-2">
                    <div>• {Math.floor(pkg.credits / 500)} image generations</div>
                    <div>• {Math.floor(pkg.credits / 2000)} video generations</div>
                    <div>• Never expires</div>
                  </div>

                  <Button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={loading !== null}
                    className={`w-full mt-4 ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90'
                        : ''
                    }`}
                  >
                    {loading === pkg.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Buy Now'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted/30 rounded-xl border border-primary/10">
            <h3 className="font-semibold text-lg mb-3">How it works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">1. Choose package</span>
                <p>Select the credit package that fits your needs</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">2. Pay with crypto</span>
                <p>Use Bitcoin, Ethereum, USDT, or 160+ cryptocurrencies</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">3. Get credits instantly</span>
                <p>Credits are added automatically after payment confirmation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
