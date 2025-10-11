import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: session } = await supabase.from("user_sessions").select("is_admin").eq("user_id", user.id).single()

    if (!session || !session.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get app settings
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "app_enabled")
      .single()

    if (error) {
      console.error("[v0] Error fetching settings:", error)
      return NextResponse.json({ app_enabled: true }, { status: 200 })
    }

    return NextResponse.json({ app_enabled: settings?.setting_value ?? true })
  } catch (error) {
    console.error("[v0] Settings GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: session } = await supabase.from("user_sessions").select("is_admin").eq("user_id", user.id).single()

    if (!session || !session.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { app_enabled } = await request.json()

    // Update app settings
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        setting_key: "app_enabled",
        setting_value: app_enabled,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("setting_key", "app_enabled")

    if (error) {
      console.error("[v0] Error updating settings:", error)
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    console.log("[v0] App enabled status updated to:", app_enabled)
    return NextResponse.json({ success: true, app_enabled })
  } catch (error) {
    console.error("[v0] Settings POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
