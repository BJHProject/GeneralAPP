"use client"

import { Card } from "@/components/ui/card"
import { VideoIcon } from "lucide-react"
import { useState, useEffect } from "react"

interface GeneratedVideo {
  id: string
  url: string
  prompt: string
  duration_seconds: number
  created_at: string
  is_saved: boolean
}

export function FeaturedRecentVideo() {
  const [latestVideo, setLatestVideo] = useState<GeneratedVideo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadLatestVideo = async () => {
    console.log("[v0] Loading latest video")
    setIsLoading(true)
    try {
      const response = await fetch("/api/videos")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const videos = data.videos || []

      if (videos.length > 0) {
        // Get the most recent video
        const sorted = videos.sort(
          (a: GeneratedVideo, b: GeneratedVideo) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        setLatestVideo(sorted[0])
        console.log("[v0] Latest video loaded:", sorted[0].id)
      } else {
        setLatestVideo(null)
      }
    } catch (error) {
      console.error("[v0] Failed to load latest video:", error)
      setLatestVideo(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLatestVideo()

    const handleVideoGenerated = () => {
      console.log("[v0] Video generated event received, refreshing featured video")
      loadLatestVideo()
    }

    window.addEventListener("videoGenerated", handleVideoGenerated)

    return () => {
      window.removeEventListener("videoGenerated", handleVideoGenerated)
    }
  }, [])

  if (isLoading) {
    return (
      <Card className="border-border bg-card p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <VideoIcon className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Card>
    )
  }

  if (!latestVideo) {
    return (
      <Card className="border-border bg-card p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <VideoIcon className="h-16 w-16 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Your generated video will appear here</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card overflow-hidden h-full flex flex-col">
      <div className="flex-1 bg-black flex items-center justify-center">
        <video src={latestVideo.url} controls autoPlay loop className="w-full h-full object-contain" />
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium text-foreground line-clamp-2" title={latestVideo.prompt}>
          {latestVideo.prompt}
        </p>
        <p className="text-xs text-muted-foreground">
          {latestVideo.duration_seconds}s • {new Date(latestVideo.created_at).toLocaleDateString()}
        </p>
      </div>
    </Card>
  )
}
