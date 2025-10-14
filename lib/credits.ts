import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Server-enforced pricing to prevent client tampering
export const CREDIT_COSTS = {
  image: 500,
  edit: 1000,
  video1: 1000, // Added 1 second video option
  video3: 2000,
  video5: 3000,
} as const

export type CreditOperation = "image" | "edit" | "video1" | "video3" | "video5" // Added video1
export type CreditReason = "signup" | "image" | "edit" | "video1" | "video3" | "video5" // Added video1

interface ChargeCreditsResult {
  success: boolean
  newBalance?: number
  error?: string
}

interface IdempotencyResult {
  exists: boolean
  status?: "started" | "succeeded" | "failed"
  result?: any
}

/**
 * Atomically charge credits using database function
 * Returns 409 error if insufficient credits
 */
export async function chargeCredits(
  userId: string,
  operation: CreditOperation,
  refId?: string,
): Promise<ChargeCreditsResult> {
  const supabase = await createClient()
  const cost = CREDIT_COSTS[operation]

  console.log("[v0] Attempting to charge", cost, "credits for", operation)

  try {
    const { data: user, error: fetchError } = await supabase.from("users").select("credits").eq("id", userId).single()

    if (fetchError || !user) {
      console.error("[v0] User not found:", fetchError)
      return {
        success: false,
        error: "User not found",
      }
    }

    if (user.credits < cost) {
      console.log("[v0] Insufficient credits:", user.credits, "<", cost)
      return {
        success: false,
        error: "insufficient credits",
      }
    }

    // Atomic update
    const newBalance = user.credits - cost
    const { error: updateError } = await supabase
      .from("users")
      .update({ credits: newBalance })
      .eq("id", userId)
      .eq("credits", user.credits) // Optimistic locking

    if (updateError) {
      console.error("[v0] Failed to update credits:", updateError)
      return {
        success: false,
        error: "Failed to charge credits",
      }
    }

    // Insert ledger entry
    const { error: ledgerError } = await supabase.from("credit_ledger").insert({
      user_id: userId,
      amount: -cost,
      operation_type: operation,
      description: `${operation} generation`,
      balance_after: newBalance,
      metadata: refId ? { ref_id: refId } : null,
    })

    if (ledgerError) {
      console.error("[v0] Failed to create ledger entry:", ledgerError)
    }

    console.log("[v0] Credits charged successfully. New balance:", newBalance)

    return {
      success: true,
      newBalance,
    }
  } catch (error: any) {
    console.error("[v0] Exception charging credits:", error)
    return {
      success: false,
      error: error.message || "Failed to charge credits",
    }
  }
}

/**
 * Check idempotency key and return cached result if exists
 */
export async function checkIdempotency(key: string, userId: string): Promise<IdempotencyResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("idempotency_keys")
    .select("status, result")
    .eq("key", key)
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return { exists: false }
  }

  return {
    exists: true,
    status: data.status as "started" | "succeeded" | "failed",
    result: data.result,
  }
}

/**
 * Create idempotency key with status
 */
export async function createIdempotencyKey(
  key: string,
  userId: string,
  operation: string,
  status: "started" | "succeeded" | "failed" = "started",
  result?: any,
): Promise<void> {
  const supabase = await createClient()

  await supabase.from("idempotency_keys").insert({
    key,
    user_id: userId,
    operation,
    status,
    result: result || null,
  })
}

/**
 * Update idempotency key status and result
 */
export async function updateIdempotencyKey(
  key: string,
  status: "started" | "succeeded" | "failed",
  result?: any,
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from("idempotency_keys")
    .update({
      status,
      result: result || null,
    })
    .eq("key", key)
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("users").select("credits").eq("id", userId).single()

  if (error || !data) {
    console.error("[v0] Error fetching credits:", error)
    return 0
  }

  return data.credits || 0
}

/**
 * Ensure user exists and grant signup bonus if new
 * Called on first login
 */
export async function ensureUserWithBonus(
  userId: string,
  email: string,
  name?: string,
  image?: string,
): Promise<{ isNewUser: boolean; credits: number }> {
  const supabase = await createClient()

  try {
    // Call database function for atomic user creation + bonus
    const { data, error } = await supabase.rpc("grant_signup_bonus", {
      p_user_id: userId,
      p_email: email,
      p_name: name || null,
      p_image: image || null,
    })

    if (error) {
      console.error("[v0] Error granting signup bonus:", error)
      throw error
    }

    const result = Array.isArray(data) ? data[0] : data

    console.log("[v0] User setup complete:", {
      userId,
      isNewUser: result.is_new_user,
      credits: result.credits,
    })

    return {
      isNewUser: result.is_new_user,
      credits: result.credits,
    }
  } catch (error: any) {
    console.error("[v0] Exception in ensureUserWithBonus:", error)
    throw error
  }
}

/**
 * Add credits to user (admin function)
 */
export async function addCredits(userId: string, amount: number, reason = "bonus"): Promise<void> {
  const supabase = await createClient()

  // Get current balance
  const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single()

  if (!user) {
    throw new Error("User not found")
  }

  const newBalance = user.credits + amount

  // Update credits
  await supabase.from("users").update({ credits: newBalance }).eq("id", userId)

  // Insert ledger entry
  await supabase.from("credit_ledger").insert({
    user_id: userId,
    amount: amount,
    operation_type: reason,
    balance_after: newBalance,
  })
}

/**
 * Ensure user exists in database before operations
 * Creates user with 3000 credit bonus if they don't exist
 * Uses service role to bypass RLS policies
 */
export async function ensureUserExists(userId: string, email: string, name?: string, image?: string): Promise<void> {
  console.log("[v0] ensureUserExists called for user:", userId, email)

  const supabase = createServiceRoleClient()

  // Check if user exists
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("id, credits")
    .eq("id", userId)
    .single()

  if (existingUser) {
    console.log("[v0] User exists with", existingUser.credits, "credits")
    return
  }

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 is "not found" error, which is expected for new users
    console.error("[v0] Error checking user existence:", checkError)
  }

  console.log("[v0] User doesn't exist, creating with 3000 credit bonus")

  const { error: insertError } = await supabase.from("users").insert({
    id: userId,
    email: email,
    name: name || email.split("@")[0],
    image: image,
    membership_tier: "free",
    credits: 3000,
  })

  if (insertError) {
    console.error("[v0] Failed to create user:", insertError)
    throw new Error(`Failed to create user: ${insertError.message}`)
  }

  const { error: ledgerError } = await supabase.from("credit_ledger").insert({
    user_id: userId,
    amount: 3000,
    operation_type: "signup",
    description: "Welcome bonus",
    balance_after: 3000,
  })

  if (ledgerError) {
    console.error("[v0] Failed to create ledger entry:", ledgerError)
  }

  console.log("[v0] User created successfully with 3000 credits")
}
