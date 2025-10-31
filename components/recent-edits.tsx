"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, RefreshCw, Download, Trash2 } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface EditedImage {
  id: string
  input_image_url: string
  output_image_url: string
  prompt: string
  is_saved: boolean
  created_at: string
}

export function RecentEdits() {
  const router = useRouter()
  const [images, setImages] = useState<EditedImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set())
  const [savingImages, setSavingImages] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  const loadImages = async () => {
    console.log("[v0] Loading edited images from API")
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/edited-images")
      console.log("[v0] API response status:", response.status)

      const contentType = response.headers.get("content-type")
      console.log("[v0] Content type:", contentType)

      if (!contentType || !contentType.includes("application/json")) {
        console.error("[v0] API returned non-JSON response:", contentType)
        setError("Unable to load edited images in preview environment")
        setImages([])
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Received edited images:", data.recent ? data.recent.length : 0)
      const recentImages = data.recent || []
      console.log("[v0] Displaying recent edited images:", recentImages.length)
      setImages(recentImages)
    } catch (error) {
      console.error("[v0] Failed to load edited images:", error)
      setError("Unable to load edited images. This may not work in preview mode.")
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImages()

    const handleImageEdited = () => {
      console.log("[v0] Image edited event received, refreshing gallery")
      loadImages()
    }

    window.addEventListener("imageEdited", handleImageEdited)

    return () => {
      window.removeEventListener("imageEdited", handleImageEdited)
    }
  }, [])

  const handleDelete = async (imageId: string) => {
    console.log("[v0] Deleting edited image:", imageId)
    setDeletingImages((prev) => new Set(prev).add(imageId))

    try {
      const response = await fetch("/api/delete-edited-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete edited image")
      }

      console.log("[v0] Edited image deleted successfully")
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

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `edited-${prompt.slice(0, 30)}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const handleSave = async (imageId: string) => {
    console.log("[v0] Saving edited image:", imageId)
    setSavingImages((prev) => new Set(prev).add(imageId))

    try {
      const response = await fetch("/api/save-edited-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) {
        throw new Error("Failed to save edited image")
      }

      console.log("[v0] Edited image saved successfully")
      setImages((prev) => prev.map((img) => 
        img.id === imageId ? { ...img, is_saved: true } : img
      ))
      toast.success("Edited image saved to gallery")
    } catch (error) {
      console.error("[v0] Save error:", error)
      toast.error("Failed to save edited image")
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
          <h2 className="text-2xl font-bold text-foreground">Recent Edits</h2>
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
          <h2 className="text-2xl font-bold text-foreground">Recent Edits</h2>
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
          <h2 className="text-2xl font-bold text-foreground">Recent Edits</h2>
        </div>
        <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-xl shadow-primary/5 p-12 rounded-2xl">
          <div className="text-center">
            <p className="text-muted-foreground">No edited images yet. Edit your first image to see it here!</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <h2 className="text-2xl font-bold text-foreground">Recent Edits</h2>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <Card
            key={image.id}
            className="group overflow-hidden border-0 bg-card/50 shadow-xl shadow-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] rounded-2xl"
          >
            <div
              className="relative overflow-hidden flex items-center justify-center cursor-pointer aspect-[2/3]"
              onClick={() => setFullscreenImage(image.output_image_url)}
            >
              {/* Blurred background layer */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${image.output_image_url})`,
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
                  src={image.output_image_url || "/placeholder.svg"}
                  alt={image.prompt}
                  fill
                  className="object-contain"
                />
              </div>
              
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 z-20" />
              
              {/* Action icons - bottom right corner - always visible */}
              <div className="absolute bottom-0 right-0 flex flex-col gap-0 z-30">
                {/* Heart (save) icon - white when unsaved, pink when saved, turns pink on hover */}
                <button
                  className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer group/heart-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!image.is_saved) {
                      handleSave(image.id)
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
                    setFullscreenImage(image.output_image_url)
                  }}
                >
                  <img
                    src="/icons/resize.png"
                    alt="Fullscreen"
                    className="w-7 h-7 object-contain"
                  />
                </button>
              </div>

              {/* Download and Delete buttons on hover - bottom center */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 pb-4 opacity-0 transition-opacity group-hover:opacity-100 z-30">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 bg-background/90 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(image.output_image_url, image.prompt)
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 bg-background/90 hover:bg-background text-red-500 hover:text-red-600"
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
            />
          </div>
        </div>
      )}
    </div>
  )
}
