import { createClient } from "@/lib/supabase/server"

export const CREDIT_COSTS = {
  image: 500,
  edit: 1000,
  video3: 2000,
  video5: 3000,
  IMAGE: 500,
  EDIT: 1000,
  VIDEO_3S: 2000,
  VIDEO_5S: 3000,
} as const

export type OperationType = "IMAGE" | "EDIT" | "VIDEO_3S" | "VIDEO_5S" | "PURCHASE" | "BONUS"

interface ChargeCreditsParams {
  userId: string
  amount: number
  operationType: OperationType
  description?: string
  metadata?: Record<string, any>
  idempotencyKey?: string
}

export async function getUserCredits(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("users").select("credits").eq("id", userId).single()

  if (error) {
    console.error("[v0] Error fetching user credits:", error)
    throw new Error("Failed to fetch user credits")
  }

  return data?.credits ?? 0
}

export async function chargeCredits(params: ChargeCreditsParams): Promise<{ success: boolean; newBalance: number }> {
  const { userId, amount, operationType, description, metadata, idempotencyKey } = params
  const supabase = await createClient()

  // Check idempotency if key provided
  if (idempotencyKey) {
    const { data: existingKey } = await supabase
      .from("idempotency_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .single()

    if (existingKey) {
      console.log("[v0] Idempotency key already used, skipping charge")
      const currentCredits = await getUserCredits(userId)
      return { success: true, newBalance: currentCredits }
    }
  }

  // Get current balance
  const { data: user, error: userError } = await supabase.from("users").select("credits").eq("id", userId).single()

  if (userError || !user) {
    throw new Error("User not found")
  }

  const currentBalance = user.credits

  // Check if user has enough credits
  if (currentBalance < amount) {
    throw new Error("Insufficient credits")
  }

  const newBalance = currentBalance - amount

  // Update user credits
  const { error: updateError } = await supabase.from("users").update({ credits: newBalance }).eq("id", userId)

  if (updateError) {
    console.error("[v0] Error updating credits:", updateError)
    throw new Error("Failed to update credits")
  }

  // Record transaction in ledger
  const { error: ledgerError } = await supabase.from("credit_ledger").insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    operation_type: operationType,
    description: description || `${operationType} generation`,
    metadata: metadata || {},
  })

  if (ledgerError) {
    console.error("[v0] Error recording ledger entry:", ledgerError)
  }

  // Store idempotency key if provided
  if (idempotencyKey) {
    await supabase.from("idempotency_keys").insert({
      user_id: userId,
      idempotency_key: idempotencyKey,
    })
  }

  return { success: true, newBalance }
}

export async function addCredits(
  userId: string,
  amount: number,
  description = "Credits added",
): Promise<{ success: boolean; newBalance: number }> {
  const supabase = await createClient()

  // Get current balance
  const { data: user, error: userError } = await supabase.from("users").select("credits").eq("id", userId).single()

  if (userError || !user) {
    throw new Error("User not found")
  }

  const newBalance = user.credits + amount

  // Update user credits
  const { error: updateError } = await supabase.from("users").update({ credits: newBalance }).eq("id", userId)

  if (updateError) {
    console.error("[v0] Error adding credits:", updateError)
    throw new Error("Failed to add credits")
  }

  // Record transaction in ledger
  await supabase.from("credit_ledger").insert({
    user_id: userId,
    amount: amount,
    balance_after: newBalance,
    operation_type: "BONUS",
    description,
    metadata: {},
  })

  return { success: true, newBalance }
}

export async function ensureUserExists(email: string, name?: string, image?: string): Promise<string> {
  const supabase = await createClient()

  // Check if user exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single()

  if (existingUser) {
    return existingUser.id
  }

  // Create new user with initial credits
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      email,
      name,
      image,
      credits: 3000, // Initial credits for new users
    })
    .select("id")
    .single()

  if (error || !newUser) {
    console.error("[v0] Error creating user:", error)
    throw new Error("Failed to create user")
  }

  console.log("[v0] New user created with 3000 credits:", email)

  return newUser.id
}

export async function deductCredits(
  userId: string,
  kind: "image" | "edit" | "video3" | "video5",
): Promise<{
  success: boolean
  error?: string
  remainingCredits?: number
}> {
  try {
    const cost = CREDIT_COSTS[kind]
    const result = await chargeCredits({
      userId,
      amount: cost,
      operationType: kind.toUpperCase() as OperationType,
      description: `${kind} generation`,
    })

    return {
      success: true,
      remainingCredits: result.newBalance,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to deduct credits",
    }
  }
}

export async function updateIdempotencyResult(idempotencyKey: string, status: string, result?: any): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from("idempotency_keys")
    .update({
      status,
      result,
      updated_at: new Date().toISOString(),
    })
    .eq("idempotency_key", idempotencyKey)
}

export async function checkIdempotency(
  idempotencyKey: string,
  userId: string,
  kind: string,
): Promise<{
  exists: boolean
  canProceed: boolean
  result?: any
}> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("idempotency_keys")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .single()

  if (!data) {
    return { exists: false, canProceed: true }
  }

  // If key exists, don't allow proceeding
  return {
    exists: true,
    canProceed: false,
    result: data.result,
  }
}
