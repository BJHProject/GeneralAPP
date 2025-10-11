"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Power, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AdminSettingsToggleProps {
  password?: string
}

export function AdminSettingsToggle({ password }: AdminSettingsToggleProps) {
  const [appEnabled, setAppEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      console.log("[v0] Fetching settings with password:", password ? "Yes" : "No")
      setLoading(true)
      const endpoint = password ? "/api/admin/control" : "/api/admin/settings"
      const headers: HeadersInit = password ? { Authorization: `Bearer ${password}` } : {}

      console.log("[v0] Calling endpoint:", endpoint)
      const response = await fetch(endpoint, { headers })
      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Error response:", errorText)
        throw new Error("Failed to fetch settings")
      }

      const data = await response.json()
      console.log("[v0] Settings data:", data)
      setAppEnabled(data.app_enabled)
    } catch (err) {
      console.error("[v0] Error fetching settings:", err)
      setError("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  async function toggleAppStatus(enabled: boolean) {
    try {
      console.log("[v0] Toggling app status to:", enabled)
      setUpdating(true)
      setError(null)
      const endpoint = password ? "/api/admin/control" : "/api/admin/settings"
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(password ? { Authorization: `Bearer ${password}` } : {}),
      }

      console.log("[v0] Calling endpoint:", endpoint)
      console.log("[v0] With password:", password ? "Yes" : "No")

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ app_enabled: enabled }),
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error response:", errorData)
        throw new Error(errorData.error || "Failed to update settings")
      }

      const result = await response.json()
      console.log("[v0] Update successful:", result)
      setAppEnabled(enabled)
    } catch (err) {
      console.error("[v0] Error updating settings:", err)
      setError(err instanceof Error ? err.message : "Failed to update settings")
      // Revert the toggle
      setAppEnabled(!enabled)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power className="h-5 w-5" />
          App Control
        </CardTitle>
        <CardDescription>Enable or disable image generation for all users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="app-enabled" className="text-base">
              Image Generation
            </Label>
            <p className="text-sm text-muted-foreground">
              {appEnabled ? "App is currently active" : "App is currently paused"}
            </p>
          </div>
          <Switch
            id="app-enabled"
            checked={appEnabled}
            onCheckedChange={toggleAppStatus}
            disabled={updating}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">What happens when disabled:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Users cannot generate new images</li>
            <li>HuggingFace API keys are not used</li>
            <li>Existing images remain accessible</li>
            <li>Gallery and saved images still work</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
