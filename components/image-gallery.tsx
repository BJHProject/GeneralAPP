"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Heart, Save, Check, Trash2, Maximize2, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

interface ImageGalleryProps {
  images: Array<{ url: string; id?: string; is_saved?: boolean }>
  prompt: string
  width: number
  height: number
  onImageSaved?: () => void
}

export function ImageGallery({ images, prompt, width, height, onImageSaved }: ImageGalleryProps) {
  const [likedImages, setLikedImages] = useState<Set<number>>(new Set())
  const [savedImages, setSavedImages] = useState<Set<number>>(
    new Set(images.map((img, idx) => (img.is_saved ? idx : -1)).filter((idx) => idx !== -1)),
  )
  const [savingImages, setSavingImages] = useState<Set<number>>(new Set())
  const [deletingImages, setDeletingImages] = useState<Set<number>>(new Set())
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `generated-image-${index + 1}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const handleSave = async (image: { url: string; id?: string }, index: number) => {
    if (savedImages.has(index)) return

    setSavingImages((prev) => new Set(prev).add(index))

    try {
      const response = await fetch("/api/save-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: image.id,
          imageUrl: image.url,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save image")
      }

      setSavedImages((prev) => new Set(prev).add(index))
      onImageSaved?.()
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setSavingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const handleDelete = async (image: { url: string; id?: string }, index: number) => {
    if (!image.id) return

    setDeletingImages((prev) => new Set(prev).add(index))

    try {
      const response = await fetch("/api/delete-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId: image.id }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      onImageSaved?.()
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const toggleLike = (index: number) => {
    setLikedImages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Generated Images</h2>
        <p className="text-sm text-muted-foreground">
          {images.length} {images.length === 1 ? "image" : "images"}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {images.map((image, index) => (
          <Card
            key={index}
            className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50"
          >
            <div
              className="relative aspect-[2/3] overflow-hidden bg-secondary"
              onClick={() => {
                if (activeImageIndex === index) {
                  setActiveImageIndex(null)
                } else {
                  setActiveImageIndex(index)
                }
              }}
            >
              <Image
                src={image.url || "/placeholder.svg"}
                alt={`Generated image ${index + 1}: ${prompt}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${activeImageIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              />
              <Button
                size="sm"
                variant="secondary"
                className={`absolute bottom-2 right-2 z-10 h-8 w-8 p-0 transition-opacity ${activeImageIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                onClick={(e) => {
                  e.stopPropagation()
                  console.log("[v0] Opening fullscreen for image:", image.url)
                  setFullscreenImage(image.url)
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <div
                className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4 transition-opacity ${activeImageIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSave(image, index)
                  }}
                  disabled={savedImages.has(index) || savingImages.has(index)}
                >
                  {savedImages.has(index) ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {savingImages.has(index) ? "Saving..." : "Save"}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(image.url, index)
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {image.id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(image, index)
                    }}
                    disabled={deletingImages.has(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLike(index)
                  }}
                  className={likedImages.has(index) ? "text-red-500" : ""}
                >
                  <Heart className={`h-4 w-4 ${likedImages.has(index) ? "fill-current" : ""}`} />
                </Button>
              </div>
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
