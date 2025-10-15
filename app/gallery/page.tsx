"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, RefreshCw } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"

interface GalleryImage {
  id: string
  url: string
  prompt: string
  width: number
  height: number
  created_at: string
  is_saved: boolean
}

interface GalleryVideo {
  id: string
  url: string
  prompt: string
  duration_seconds: number
  created_at: string
  is_saved: boolean
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [videos, setVideos] = useState<GalleryVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set())
  const [deletingVideos, setDeletingVideos] = useState<Set<string>>(new Set())
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set())
  const [savingVideos, setSavingVideos] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login")
      } else {
        setUser(user)
      }
    })
  }, [router])

  const loadImages = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/images")

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[v0] API returned non-JSON response:", contentType)
        setError("Unable to load images in preview environment")
        setImages([])
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("[v0] Failed to load images:", error)
      setError("Unable to load images. This may not work in preview mode.")
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadVideos = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/videos")

      const contentType = response.headers.get("content-type")
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
      setVideos(data.videos || [])
    } catch (error) {
      console.error("[v0] Failed to load videos:", error)
      setError("Unable to load videos. This may not work in preview mode.")
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadImages()
      loadVideos()
    }
  }, [user])

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${prompt.slice(0, 30)}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const handleDelete = async (imageId: string) => {
    setDeletingImages((prev) => new Set(prev).add(imageId))

    try {
      const response = await fetch("/api/delete-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  const handleSave = async (imageId: string, imageUrl: string) => {
    setSavingImages((prev) => new Set(prev).add(imageId))

    try {
      const response = await fetch("/api/save-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId,
          imageUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save image")
      }

      setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, is_saved: true } : img)))
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setSavingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  const handleVideoDownload = async (videoUrl: string, prompt: string) => {
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

  const handleVideoDelete = async (videoId: string) => {
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

      setVideos((prev) => prev.filter((vid) => vid.id !== videoId))
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setDeletingVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }

  const handleVideoSave = async (videoId: string) => {
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

      setVideos((prev) => prev.map((vid) => (vid.id === videoId ? { ...vid, is_saved: true } : vid)))
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setSavingVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
    }
  }

  const getImageObjectFit = (width: number, height: number) => {
    const aspectRatio = width / height
    // Portrait images (taller than wide) use object-cover to fill the frame
    // Square and landscape images use object-contain to show full image with black bars
    return aspectRatio >= 0.9 ? "object-contain" : "object-cover"
  }

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">My Gallery</h1>
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">My Gallery</h1>
            <Card className="border-border bg-card p-12">
              <div className="text-center">
                <p className="text-muted-foreground">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try using the deployed version for full functionality.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const savedImages = images.filter((img) => img.is_saved)
  const savedVideos = videos.filter((vid) => vid.is_saved)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">My Gallery</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadImages()
                loadVideos()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Saved Images Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Saved Images</h2>
              <p className="text-sm text-muted-foreground">
                {savedImages.length} {savedImages.length === 1 ? "image" : "images"}
              </p>
            </div>

            {savedImages.length === 0 ? (
              <Card className="border-border bg-card p-12">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    No saved images yet. Save some images to keep them permanently!
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {savedImages.map((image) => (
                  <Card
                    key={image.id}
                    className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50 cursor-pointer"
                    onClick={() => router.push(`/image/${image.id}`)}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden bg-black">
                      <Image
                        src={image.url || "/placeholder.svg"}
                        alt={image.prompt}
                        fill
                        className={`${getImageObjectFit(image.width, image.height)} transition-transform duration-300 group-hover:scale-105`}
                      />
                      <div className="absolute top-2 right-2 bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded">
                        Saved
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs text-muted-foreground" title={image.prompt}>
                        {image.prompt}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Saved Videos Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Saved Videos</h2>
              <p className="text-sm text-muted-foreground">
                {savedVideos.length} {savedVideos.length === 1 ? "video" : "videos"}
              </p>
            </div>

            {savedVideos.length === 0 ? (
              <Card className="border-border bg-card p-12">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    No saved videos yet. Save some videos to keep them permanently!
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {savedVideos.map((video) => (
                  <Card
                    key={video.id}
                    className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <video src={video.url} className="h-full w-full object-cover" muted loop playsInline />
                      <div className="absolute top-2 right-2 bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded">
                        Saved
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                          onClick={() => handleVideoDownload(video.url, video.prompt)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-2 text-red-500 hover:text-red-600"
                          onClick={() => handleVideoDelete(video.id)}
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
