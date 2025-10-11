import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  console.log("[v0] ===== CREDITS API CALLED =====")

  try {
    console.log("[v0] Step 1: Creating Supabase client")
    const supabase = await createClient()
    console.log("[v0] Step 2: Supabase client created successfully")

    console.log("[v0] Step 3: Getting user from auth")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    console.log("[v0] Step 4: Auth result -", {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message,
    })

    if (!user) {
      console.log("[v0] Step 5: No user found, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Step 6: Querying users table for user:", user.id)
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("credits, membership_tier")
      .eq("id", user.id)
      .single()

    console.log("[v0] Step 7: Database query result -", {
      hasData: !!userData,
      credits: userData?.credits,
      tier: userData?.membership_tier,
      dbError: dbError?.message,
    })

    // If user doesn't exist in users table, create them
    if (!userData || dbError) {
      console.log("[v0] Step 8: Creating new user record")
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
          image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          membership_tier: "free",
          credits: 3000,
        })
        .select("credits, membership_tier")
        .single()

      if (createError) {
        console.error("[v0] Step 9: Failed to create user -", createError)
        return NextResponse.json(
          {
            error: "Failed to create user",
            details: createError.message,
          },
          { status: 500 },
        )
      }

      console.log("[v0] Step 10: User created successfully, adding signup bonus to ledger")
      await supabase.from("credit_ledger").insert({
        user_id: user.id,
        amount: 3000,
        operation_type: "signup",
        balance_after: 3000,
      })

      console.log("[v0] Step 11: Returning new user credits: 3000")
      return NextResponse.json({
        credits: 3000,
        membershipTier: "free",
      })
    }

    console.log("[v0] Step 12: Returning existing user credits:", userData.credits)
    return NextResponse.json({
      credits: userData.credits || 0,
      membershipTier: userData.membership_tier || "free",
    })
  } catch (error: any) {
    console.error("[v0] ===== CREDITS API EXCEPTION =====", error)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
