import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

export async function GET(request: Request) {
  try {
    console.log("[v0] Admin control GET request received")
    const authHeader = request.headers.get("authorization")
    const password = authHeader?.replace("Bearer ", "")

    console.log("[v0] Password provided:", password ? "Yes" : "No")
    console.log("[v0] Expected password:", ADMIN_PASSWORD)

    if (password !== ADMIN_PASSWORD) {
      console.log("[v0] Password mismatch - Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Password verified, fetching settings")
    const supabase = await createServerClient()

    // Get app settings
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "app_enabled")
      .single()

    if (error) {
      console.error("[v0] Error fetching settings:", error.message)
      console.log("[v0] Returning default value (true)")
      // Return default value if table doesn't exist or no settings found
      return NextResponse.json({ app_enabled: true }, { status: 200 })
    }

    console.log("[v0] Settings fetched:", settings)
    return NextResponse.json({ app_enabled: settings?.setting_value ?? true })
  } catch (error) {
    console.error("[v0] Control GET error:", error)
    return NextResponse.json({ app_enabled: true }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Admin control POST request received")
    const authHeader = request.headers.get("authorization")
    const password = authHeader?.replace("Bearer ", "")

    console.log("[v0] Password provided:", password ? "Yes" : "No")
    console.log("[v0] Expected password:", ADMIN_PASSWORD)

    if (password !== ADMIN_PASSWORD) {
      console.log("[v0] Password mismatch - Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)
    const { app_enabled } = body
    const supabase = await createServerClient()

    console.log("[v0] Updating app_enabled to:", app_enabled)

    // Update app settings using upsert
    const { error } = await supabase.from("app_settings").upsert(
      {
        setting_key: "app_enabled",
        setting_value: app_enabled,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "setting_key",
      },
    )

    if (error) {
      console.error("[v0] Error updating settings:", error.message, error.details)
      return NextResponse.json({ error: "Failed to update settings", details: error.message }, { status: 500 })
    }

    console.log("[v0] App enabled status updated successfully to:", app_enabled)
    return NextResponse.json({ success: true, app_enabled })
  } catch (error) {
    console.error("[v0] Control POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
