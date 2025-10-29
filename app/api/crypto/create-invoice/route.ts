import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import NowPaymentsApi from '@nowpaymentsio/nowpayments-api-js'

const CREDIT_PACKAGES = {
  starter: { amount: 5, credits: 5000, name: 'Starter Package' },
  popular: { amount: 9.99, credits: 10000, name: 'Popular Package' },
  pro: { amount: 19.99, credits: 20000, name: 'Pro Package' },
  elite: { amount: 49.99, credits: 50000, name: 'Elite Package' },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { packageId } = await request.json()

    if (!packageId || !CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
    }

    const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]

    const apiKey = process.env.NOWPAYMENTS_API_KEY
    if (!apiKey) {
      console.error('NOWPAYMENTS_API_KEY not configured')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    const npApi = new NowPaymentsApi({ apiKey })

    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://sexify.app'
    const successUrl = `${baseUrl}/buy-credits?success=true`
    const cancelUrl = `${baseUrl}/buy-credits`
    const ipnCallbackUrl = `${baseUrl}/api/crypto/ipn`

    const invoiceResult = await npApi.createInvoice({
      price_amount: pkg.amount,
      price_currency: 'usd',
      order_id: `${user.id}-${Date.now()}`,
      order_description: `${pkg.name} - ${pkg.credits.toLocaleString()} credits`,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ipn_callback_url: ipnCallbackUrl,
    })

    if (invoiceResult instanceof Error) {
      console.error('Failed to create invoice:', invoiceResult)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    const invoice = invoiceResult as any

    const { error: dbError } = await supabase
      .from('crypto_purchases')
      .insert({
        user_id: user.id,
        invoice_id: invoice.id,
        amount_usd: pkg.amount,
        credits_amount: pkg.credits,
        payment_status: 'waiting',
      })

    if (dbError) {
      console.error('Failed to save crypto purchase:', dbError)
    }

    return NextResponse.json({
      success: true,
      invoiceUrl: invoice.invoice_url,
      invoiceId: invoice.id,
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create payment invoice' },
      { status: 500 }
    )
  }
}
