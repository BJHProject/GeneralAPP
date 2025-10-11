"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, RefreshCw, Maximize2, X, Save } from "lucide-react"
import { useState, useEffect } from "react"

interface GeneratedVideo {
  id: string
  url: string
  prompt: string
  duration_seconds: number
  created_at: string
  is_saved: boolean
}

export function RecentVideos() {
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingVideos, setDeletingVideos] = useState<Set<string>>(new Set())
  const [savingVideos, setSavingVideos] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  const loadVideos = async () => {
    console.log("[v0] Loading videos from API")
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/videos")
      console.log("[v0] API response status:", response.status)

      const contentType = response.headers.get("content-type")
      console.log("[v0] Content type:", contentType)

      if (!contentType || !contentType.includes("application/json")) {
        console.error("[v0] API returned non-JSON response:", contentType)
        setError("Unable to load videos in preview environment")
        setVideos([])
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Received videos:", data.videos ? data.videos.length : 0)
      const unsavedVideos = (data.videos || []).filter((vid: GeneratedVideo) => !vid.is_saved)
      console.log("[v0] Filtered to unsaved videos:", unsavedVideos.length)
      setVideos(unsavedVideos)
    } catch (error) {
      console.error("[v0] Failed to load videos:", error)
      setError("Unable to load videos. This may not work in preview mode.")
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()

    const handleVideoGenerated = () => {
      console.log("[v0] Video generated event received, refreshing gallery")
      loadVideos()
    }

    window.addEventListener("videoGenerated", handleVideoGenerated)

    return () => {
      window.removeEventListener("videoGenerated", handleVideoGenerated)
    }
  }, [])

  const handleDownload = async (videoUrl: string, prompt: string) => {
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${prompt.slice(0, 30)}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const handleDelete = async (videoId: string) => {
    console.log("[v0] Deleting video:", videoId)
    setDeletingVideos((prev) => new Set(prev).add(videoId))

    try {
      const response = await fetch("/api/delete-video", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete video")
      }

      console.log("[v0] Video deleted successfully")
      setVideos((prev) => prev.filter((vid) => vid.id !== videoId))
    } catch (error) {
      console.error("[v0] Delete error:", error)
    } finally {
      setDeletingVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }

  const handleSave = async (videoId: string) => {
    console.log("[v0] Saving video:", videoId)
    setSavingVideos((prev) => new Set(prev).add(videoId))

    try {
      const response = await fetch("/api/save-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) {
        throw new Error("Failed to save video")
      }

      console.log("[v0] Video saved successfully")
      setVideos((prev) => prev.filter((vid) => vid.id !== videoId))
    } catch (error) {
      console.error("[v0] Save error:", error)
    } finally {
      setSavingVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold text-foreground">Recent Videos</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold text-foreground">Recent Videos</h2>
        </div>
        <Card className="border-border bg-card p-12">
          <div className="text-center">
            <p className="text-muted-foreground">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">Try using the deployed version for full functionality.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold text-foreground">Recent Videos</h2>
        </div>
        <Card className="border-border bg-card p-12">
          <div className="text-center">
            <p className="text-muted-foreground">No generated videos yet. Create your first video to see it here!</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <h2 className="text-2xl font-bold text-foreground">Recent Videos</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50"
          >
            <div
              className="relative aspect-video overflow-hidden bg-black"
              onClick={() => {
                if (activeVideoId === video.id) {
                  setActiveVideoId(null)
                } else {
                  setActiveVideoId(video.id)
                }
              }}
            >
              <video src={video.url} className="h-full w-full object-contain" muted loop playsInline />
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${activeVideoId === video.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              />
              <Button
                size="sm"
                variant="secondary"
                className={`absolute bottom-2 right-2 z-10 h-8 w-8 p-0 transition-opacity ${activeVideoId === video.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                onClick={(e) => {
                  e.stopPropagation()
                  console.log("[v0] Opening fullscreen for video:", video.url)
                  setFullscreenVideo(video.url)
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <div
                className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4 transition-opacity ${activeVideoId === video.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSave(video.id)
                  }}
                  disabled={savingVideos.has(video.id)}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(video.url, video.prompt)
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 text-red-500 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(video.id)
                  }}
                  disabled={deletingVideos.has(video.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-3">
              <p className="truncate text-xs text-muted-foreground" title={video.prompt}>
                {video.prompt}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {video.duration_seconds}s • {new Date(video.created_at).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {fullscreenVideo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => {
            console.log("[v0] Closing fullscreen")
            setFullscreenVideo(null)
          }}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4 z-[10000] text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              console.log("[v0] Close button clicked")
              setFullscreenVideo(null)
            }}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <video
              src={fullscreenVideo}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
