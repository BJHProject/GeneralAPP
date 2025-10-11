import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user ID from email
    const { data: user } = await supabase.from("users").select("id").eq("email", session.user.email).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: ledger, error } = await supabase
      .from("credit_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[v0] Error fetching ledger:", error)
      return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 })
    }

    return NextResponse.json({ ledger })
  } catch (error) {
    console.error("[v0] Error fetching ledger:", error)
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 })
  }
}
