import { createClient } from "@/lib/supabase/server"

export async function auth() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    console.log("[v0] Auth check:", {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: error?.message,
    })

    if (!user) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      },
    }
  } catch (error) {
    console.error("[v0] Auth exception:", error)
    return null
  }
}
