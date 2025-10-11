import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, ImageIcon, TrendingUp, Activity } from "lucide-react"
import { Header } from "@/components/header"
import { AdminSettingsToggle } from "@/components/admin-settings-toggle"

interface UserStats {
  user_id: string
  email: string
  provider: string
  total_generations: number
  saved_images: number
  last_activity: string | null
  first_login: string | null
  registered_at: string
  is_new: boolean
}

async function getUserStats(): Promise<UserStats[]> {
  const supabase = await createClient()

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError || !authUsers) {
    console.error("Error fetching auth users:", authError)
    return []
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("user_sessions")
    .select("user_id, email, provider, logged_in_at, last_activity_at")
    .order("last_activity_at", { ascending: false })

  if (sessionsError) {
    console.error("Error fetching sessions:", sessionsError)
  }

  const { data: images, error: imagesError } = await supabase.from("images").select("user_id, is_saved")

  if (imagesError) {
    console.error("Error fetching images:", imagesError)
  }

  const sessionMap = new Map<string, { provider: string; first_login: string; last_activity: string }>()
  sessions?.forEach((session) => {
    if (!sessionMap.has(session.user_id)) {
      sessionMap.set(session.user_id, {
        provider: session.provider,
        first_login: session.logged_in_at,
        last_activity: session.last_activity_at || session.logged_in_at,
      })
    } else {
      const existing = sessionMap.get(session.user_id)!
      if (new Date(session.logged_in_at) < new Date(existing.first_login)) {
        existing.first_login = session.logged_in_at
      }
      if (new Date(session.last_activity_at || session.logged_in_at) > new Date(existing.last_activity)) {
        existing.last_activity = session.last_activity_at || session.logged_in_at
      }
    }
  })

  const generationMap = new Map<string, { total: number; saved: number }>()
  images?.forEach((image) => {
    if (!generationMap.has(image.user_id)) {
      generationMap.set(image.user_id, { total: 0, saved: 0 })
    }
    const stats = generationMap.get(image.user_id)!
    stats.total++
    if (image.is_saved) {
      stats.saved++
    }
  })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const userStats: UserStats[] = authUsers.users.map((authUser) => {
    const sessionData = sessionMap.get(authUser.id)
    const generationData = generationMap.get(authUser.id)
    const registeredAt = authUser.created_at
    const isNew = new Date(registeredAt) > sevenDaysAgo

    return {
      user_id: authUser.id,
      email: authUser.email || "No email",
      provider: sessionData?.provider || authUser.app_metadata?.provider || "email",
      total_generations: generationData?.total || 0,
      saved_images: generationData?.saved || 0,
      last_activity: sessionData?.last_activity || null,
      first_login: sessionData?.first_login || null,
      registered_at: registeredAt,
      is_new: isNew,
    }
  })

  return userStats.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
}

async function getOverallStats() {
  const supabase = await createClient()

  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const totalUsers = authUsers?.users.length || 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const newUsers = authUsers?.users.filter((u) => new Date(u.created_at) > sevenDaysAgo).length || 0

  const { count: totalGenerations } = await supabase.from("images").select("*", { count: "exact", head: true })

  const { count: savedImages } = await supabase
    .from("images")
    .select("*", { count: "exact", head: true })
    .eq("is_saved", true)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const { data: recentSessions } = await supabase
    .from("user_sessions")
    .select("user_id")
    .gte("last_activity_at", yesterday.toISOString())

  const activeUsers = new Set(recentSessions?.map((s) => s.user_id) || []).size

  return {
    totalUsers,
    newUsers,
    totalGenerations: totalGenerations || 0,
    savedImages: savedImages || 0,
    activeUsers,
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: session } = await supabase.from("user_sessions").select("is_admin").eq("user_id", user.id).single()

  if (!session || !session.is_admin) {
    redirect("/")
  }

  const userStats = await getUserStats()
  const overallStats = await getOverallStats()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor user activity and generation statistics</p>
        </div>

        <div className="mb-8">
          <AdminSettingsToggle />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+{overallStats.newUsers} new this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalGenerations}</div>
              <p className="text-xs text-muted-foreground">Images created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Images</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.savedImages}</div>
              <p className="text-xs text-muted-foreground">Permanently saved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Registered Users</CardTitle>
            <CardDescription>Complete list of all registered users with their activity statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Generations</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  userStats.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.email}
                        {user.is_new && (
                          <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
                            NEW
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {user.provider}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{user.total_generations}</TableCell>
                      <TableCell className="text-right">{user.saved_images}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.registered_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : "Never"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
