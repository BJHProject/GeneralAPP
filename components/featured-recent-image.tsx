"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, RefreshCw, Maximize2, X, Save } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  width: number
  height: number
  created_at: string
  is_saved: boolean
}

export function FeaturedRecentImage() {
  const [image, setImage] = useState<GeneratedImage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)

  const loadLatestImage = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/images")
      const contentType = response.headers.get("content-type")

      if (!contentType || !contentType.includes("application/json")) {
        setError("Unable to load images in preview environment")
        setImage(null)
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const unsavedImages = (data.images || []).filter((img: GeneratedImage) => !img.is_saved)

      // Get the most recent image (first in the array)
      if (unsavedImages.length > 0) {
        setImage(unsavedImages[0])
      } else {
        setImage(null)
      }
    } catch (error) {
      console.error("[v0] Failed to load latest image:", error)
      setError("Unable to load image")
      setImage(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLatestImage()

    const handleImageGenerated = () => {
      loadLatestImage()
    }

    window.addEventListener("imageGenerated", handleImageGenerated)

    return () => {
      window.removeEventListener("imageGenerated", handleImageGenerated)
    }
  }, [])

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
    setIsDeleting(true)

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

      setImage(null)
      // Reload to get the next image
      await loadLatestImage()
    } catch (error) {
      console.error("[v0] Delete error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async (imageId: string, imageUrl: string) => {
    setIsSaving(true)

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

      setImage(null)
      // Reload to get the next image
      await loadLatestImage()
    } catch (error) {
      console.error("[v0] Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const getImageObjectFit = (width: number, height: number) => {
    return "object-contain"
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card h-full min-h-[600px] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  if (error || !image) {
    return (
      <Card className="border-border bg-card h-full min-h-[600px] flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-muted-foreground">
            {error || "No recent images. Generate your first image to see it here!"}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card
        className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50 h-full"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="relative h-full min-h-[600px] overflow-hidden bg-black">
          <Image
            src={image.url || "/placeholder.svg"}
            alt={image.prompt}
            fill
            className={`${getImageObjectFit(image.width, image.height)} transition-transform duration-300 group-hover:scale-105`}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}
          />
          <Button
            size="sm"
            variant="secondary"
            className={`absolute bottom-2 right-2 z-10 h-8 w-8 p-0 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}
            onClick={() => setFullscreenImage(image.url)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}
          >
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => handleSave(image.id, image.url)}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => handleDownload(image.url, image.prompt)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2 text-red-500 hover:text-red-600"
              onClick={() => handleDelete(image.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-3">
          <p className="truncate text-xs text-muted-foreground" title={image.prompt}>
            {image.prompt}
          </p>
          <p className="truncate text-xs text-muted-foreground">{new Date(image.created_at).toLocaleDateString()}</p>
        </div>
      </Card>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4 z-[10000] text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              setFullscreenImage(null)
            }}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={fullscreenImage || "/placeholder.svg"}
              alt="Fullscreen view"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
