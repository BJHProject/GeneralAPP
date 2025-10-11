import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { addCredits } from "@/lib/credits-supabase"

export async function POST(request: Request) {
  try {
    const { password, email, amount } = await request.json()

    // Simple admin password check
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!email || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user ID from email
    const { data: user } = await supabase.from("users").select("id").eq("email", email).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const result = await addCredits(user.id, amount, `Admin added ${amount} credits`)

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      message: `Successfully added ${amount} credits to ${email}`,
    })
  } catch (error) {
    console.error("[v0] Error adding credits:", error)
    return NextResponse.json({ error: "Failed to add credits" }, { status: 500 })
  }
}
