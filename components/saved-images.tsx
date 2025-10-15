"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, RefreshCw, Maximize2, X, HelpCircle } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"

interface SavedImage {
  id: string
  url: string
  prompt: string
  width: number
  height: number
  created_at: string
}

export function SavedImages() {
  const [images, setImages] = useState<SavedImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [activeImageId, setActiveImageId] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

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
      const savedOnly = (data.images || []).filter((img: SavedImage & { is_saved: boolean }) => img.is_saved)
      setImages(savedOnly)
    } catch (error) {
      console.error("[v0] Failed to load images:", error)
      setError("Unable to load images. This may not work in preview mode.")
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold text-foreground">Saved Images</h2>
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
          <h2 className="text-2xl font-bold text-foreground">Saved Images</h2>
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

  if (images.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold text-foreground">Saved Images</h2>
        </div>
        <Card className="border-border bg-card p-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              No saved images yet. Generate and save some images to see them here!
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-2xl font-bold text-foreground">Saved Images</h2>
        <div className="relative">
          <button
            className="group/tooltip inline-flex items-center justify-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
          {showTooltip && (
            <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-md bg-popover p-3 text-sm text-popover-foreground shadow-lg border border-border">
              Only your last 10 generated images are kept in history. Save images to keep them permanently.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <Card
            key={image.id}
            className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50"
          >
            <div
              className="relative aspect-[2/3] overflow-hidden bg-secondary"
              onClick={() => {
                if (activeImageId === image.id) {
                  setActiveImageId(null)
                } else {
                  setActiveImageId(image.id)
                }
              }}
            >
              <Image
                src={image.url || "/placeholder.svg"}
                alt={image.prompt}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${activeImageId === image.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              />
              <Button
                size="sm"
                variant="secondary"
                className={`absolute bottom-2 right-2 z-10 h-8 w-8 p-0 transition-opacity ${activeImageId === image.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                onClick={(e) => {
                  e.stopPropagation()
                  console.log("[v0] Opening fullscreen for image:", image.url)
                  setFullscreenImage(image.url)
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <div
                className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4 transition-opacity ${activeImageId === image.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(image.url, image.prompt)
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
                    handleDelete(image.id)
                  }}
                  disabled={deletingImages.has(image.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => {
            console.log("[v0] Closing fullscreen")
            setFullscreenImage(null)
          }}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4 z-[10000] text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              console.log("[v0] Close button clicked")
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
    </div>
  )
}
