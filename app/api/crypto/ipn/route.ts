import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { atomicCreditAdd } from '@/lib/credits/transactions'
import crypto from 'crypto'

function sortObject(obj: any): any {
  return Object.keys(obj)
    .sort()
    .reduce((result: any, key) => {
      result[key] = obj[key] && typeof obj[key] === 'object' ? sortObject(obj[key]) : obj[key]
      return result
    }, {})
}

function verifyIPNSignature(payload: any, receivedSignature: string, ipnSecret: string): boolean {
  const sortedPayload = sortObject(payload)
  const hmac = crypto.createHmac('sha512', ipnSecret)
  hmac.update(JSON.stringify(sortedPayload))
  const calculatedSignature = hmac.digest('hex')
  return calculatedSignature === receivedSignature
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-nowpayments-sig')
    if (!signature) {
      console.error('[IPN] No signature header found')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET
    if (!ipnSecret) {
      console.error('[IPN] IPN secret not configured')
      return NextResponse.json({ error: 'IPN not configured' }, { status: 500 })
    }

    const payload = await request.json()
    console.log('[IPN] Received webhook:', JSON.stringify(payload, null, 2))

    const isValid = verifyIPNSignature(payload, signature, ipnSecret)
    if (!isValid) {
      console.error('[IPN] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('[IPN] Signature verified successfully')

    const supabase = createServiceRoleClient()

    const { invoice_id, payment_id, payment_status, actually_paid, pay_currency } = payload

    const { data: purchase, error: fetchError } = await supabase
      .from('crypto_purchases')
      .select('*')
      .or(`invoice_id.eq.${invoice_id},payment_id.eq.${payment_id}`)
      .single()

    if (fetchError || !purchase) {
      console.error('[IPN] Purchase not found:', { invoice_id, payment_id, fetchError })
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('crypto_purchases')
      .update({
        payment_id: payment_id || purchase.payment_id,
        payment_status,
        pay_currency: pay_currency || purchase.pay_currency,
        actually_paid: actually_paid || purchase.actually_paid,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchase.id)

    if (updateError) {
      console.error('[IPN] Failed to update purchase:', updateError)
      return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
    }

    if (payment_status === 'finished' && !purchase.credited) {
      console.log('[IPN] Payment finished, crediting user atomically:', {
        user_id: purchase.user_id,
        credits: purchase.credits_amount,
      })

      const idempotencyKey = `crypto_purchase_${payment_id || invoice_id}`
      
      const result = await atomicCreditAdd(
        purchase.user_id,
        purchase.credits_amount,
        'CRYPTO_PURCHASE',
        `Crypto purchase: $${purchase.amount_usd} → ${purchase.credits_amount} credits`,
        idempotencyKey,
        {
          invoice_id,
          payment_id,
          pay_currency,
          amount_usd: purchase.amount_usd,
        }
      )

      if (!result.success) {
        if (result.code === 'DUPLICATE_REQUEST') {
          console.log('[IPN] Credits already added for this payment (idempotency)')
        } else {
          console.error('[IPN] Failed to credit user:', result.error)
          return NextResponse.json({ error: 'Failed to credit user' }, { status: 500 })
        }
      }

      const { error: markCreditedError } = await supabase
        .from('crypto_purchases')
        .update({ credited: true })
        .eq('id', purchase.id)

      if (markCreditedError) {
        console.error('[IPN] Failed to mark as credited:', markCreditedError)
      }

      console.log('[IPN] User credited successfully')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[IPN] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
