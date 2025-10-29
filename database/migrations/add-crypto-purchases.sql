-- Migration: Add crypto_purchases table for NOWPayments integration
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crypto_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id TEXT UNIQUE,
  payment_id TEXT UNIQUE,
  amount_usd DECIMAL(10, 2) NOT NULL,
  credits_amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'waiting',
  pay_currency TEXT,
  actually_paid DECIMAL(20, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credited BOOLEAN DEFAULT false NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_user_id ON crypto_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_invoice_id ON crypto_purchases(invoice_id);
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_payment_id ON crypto_purchases(payment_id);
CREATE INDEX IF NOT EXISTS idx_crypto_purchases_status ON crypto_purchases(payment_status);

-- Row Level Security
ALTER TABLE crypto_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON crypto_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can manage purchases (server-side only)
CREATE POLICY "Service role can manage purchases"
  ON crypto_purchases FOR ALL
  USING (auth.role() = 'service_role');
