"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Trash2, Heart } from "lucide-react"

interface EditedImage {
  id: string
  input_image_url: string
  output_image_url: string
  prompt: string
  is_saved: boolean
  created_at: string
}

export function RecentEdits() {
  const [images, setImages] = useState<EditedImage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadImages = async () => {
    try {
      const response = await fetch("/api/edited-images")
      if (!response.ok) throw new Error("Failed to fetch images")

      const data = await response.json()
      // Filter out saved images, only show recent unsaved ones
      setImages(data.recent || [])
    } catch (error) {
      console.error("[v0] Error loading edited images:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImages()

    // Listen for new edits
    const handleImageEdited = () => {
      loadImages()
    }

    window.addEventListener("imageEdited", handleImageEdited)
    return () => window.removeEventListener("imageEdited", handleImageEdited)
  }, [])

  const handleSave = async (imageId: string) => {
    try {
      const response = await fetch("/api/save-edited-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) throw new Error("Failed to save image")

      loadImages()
    } catch (error) {
      console.error("[v0] Error saving image:", error)
    }
  }

  const handleDelete = async (imageId: string) => {
    try {
      const response = await fetch("/api/delete-edited-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) throw new Error("Failed to delete image")

      loadImages()
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
    }
  }

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `edited-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error downloading image:", error)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (images.length === 0) {
    return (
      <Card className="border-border bg-card p-12">
        <div className="text-center text-muted-foreground">
          <p>No recent edits yet. Start editing images to see them here!</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image) => (
        <Card key={image.id} className="border-border bg-card overflow-hidden group">
          <div className="relative aspect-square bg-black">
            <Image
              src={image.output_image_url || "/placeholder.svg"}
              alt={image.prompt}
              fill
              className={`${
                image.output_image_url.includes("width") && image.output_image_url.includes("height")
                  ? "object-contain"
                  : "object-cover"
              }`}
            />
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{image.prompt}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent"
                onClick={() => handleSave(image.id)}
              >
                <Heart className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload(image.output_image_url)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(image.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
