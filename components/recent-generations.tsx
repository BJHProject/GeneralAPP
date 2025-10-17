"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, RefreshCw, X, Save } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  width: number
  height: number
  created_at: string
  is_saved: boolean
}

export function RecentGenerations() {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set())
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [activeImageId, setActiveImageId] = useState<string | null>(null)

  const loadImages = async () => {
    console.log("[v0] Loading images from API")
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/images")
      console.log("[v0] API response status:", response.status)

      const contentType = response.headers.get("content-type")
      console.log("[v0] Content type:", contentType)

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
      console.log("[v0] Received images:", data.images ? data.images.length : 0)
      // Display last 20 images chronologically (API returns them in correct order)
      const recentImages = data.images || []
      console.log("[v0] Displaying recent images chronologically:", recentImages.length)
      setImages(recentImages)
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

    const handleImageGenerated = () => {
      console.log("[v0] Image generated event received, refreshing gallery")
      loadImages()
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
    console.log("[v0] Deleting image:", imageId)
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

      console.log("[v0] Image deleted successfully")
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (error) {
      console.error("[v0] Delete error:", error)
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  const handleSave = async (imageId: string, imageUrl: string) => {
    console.log("[v0] Saving image:", imageId)
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

      console.log("[v0] Image saved successfully")
      // Update the image in the list to mark as saved (keep it in past generations)
      setImages((prev) => prev.map((img) => 
        img.id === imageId ? { ...img, is_saved: true } : img
      ))
      // Show toast notification
      toast.success("Image saved to gallery")
    } catch (error) {
      console.error("[v0] Save error:", error)
      toast.error("Failed to save image")
    } finally {
      setSavingImages((prev) => {
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
          <h2 className="text-2xl font-bold text-foreground">Past Generations</h2>
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
          <h2 className="text-2xl font-bold text-foreground">Past Generations</h2>
        </div>
        <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-xl shadow-primary/5 p-12 rounded-2xl">
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
          <h2 className="text-2xl font-bold text-foreground">Past Generations</h2>
        </div>
        <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-xl shadow-primary/5 p-12 rounded-2xl">
          <div className="text-center">
            <p className="text-muted-foreground">No generated images yet. Create your first image to see it here!</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <h2 className="text-2xl font-bold text-foreground">Recent Generations</h2>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <Card
            key={image.id}
            className="group overflow-hidden border-0 bg-card/50 shadow-xl shadow-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] rounded-2xl"
          >
            <div
              className="relative overflow-hidden flex items-center justify-center cursor-pointer aspect-[2/3]"
              onClick={() => router.push(`/image/${image.id}`)}
            >
              {/* Blurred background layer */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${image.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(60px)',
                  opacity: 0.6,
                  transform: 'scale(1.1)'
                }}
              />
              
              {/* Main image on top - centered */}
              <div className="absolute inset-0 z-10">
                <Image
                  src={image.url || "/placeholder.svg"}
                  alt={image.prompt}
                  fill
                  className="object-contain"
                />
              </div>
              
              {/* Action icons - bottom right corner - always visible */}
              <div className="absolute bottom-0 right-0 flex flex-col gap-0 z-20">
                {/* Heart (save) icon - white when unsaved, pink when saved, turns pink on hover */}
                <button
                  className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer group/heart-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!image.is_saved) {
                      handleSave(image.id, image.url)
                    }
                  }}
                  disabled={savingImages.has(image.id)}
                >
                  <img
                    src={image.is_saved ? "/icons/heart-saved.png" : "/icons/heart-unsaved.png"}
                    alt={image.is_saved ? "Saved" : "Save"}
                    className={`w-7 h-7 object-contain transition-opacity duration-200 ${
                      image.is_saved ? '' : 'group-hover/heart-btn:opacity-0'
                    }`}
                  />
                  {/* Pink heart on hover for unsaved images */}
                  {!image.is_saved && (
                    <img
                      src="/icons/heart-saved.png"
                      alt="Save"
                      className="w-7 h-7 object-contain absolute top-0 left-0 opacity-0 group-hover/heart-btn:opacity-100 transition-opacity duration-200"
                    />
                  )}
                </button>
                
                {/* Resize/Fullscreen icon - hugging bottom right corner */}
                <button
                  className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFullscreenImage(image.url)
                  }}
                >
                  <img
                    src="/icons/resize.png"
                    alt="Fullscreen"
                    className="w-7 h-7 object-contain"
                  />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 p-4 backdrop-blur-2xl"
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