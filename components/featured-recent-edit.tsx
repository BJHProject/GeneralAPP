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

export function FeaturedRecentEdit() {
  const [image, setImage] = useState<EditedImage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadImage = async () => {
    try {
      const response = await fetch("/api/edited-images")
      if (!response.ok) throw new Error("Failed to fetch images")

      const data = await response.json()
      const recentImages = data.recent || []
      if (recentImages.length > 0) {
        setImage(recentImages[0])
      }
    } catch (error) {
      console.error("[v0] Error loading edited image:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImage()

    const handleImageEdited = () => {
      loadImage()
    }

    window.addEventListener("imageEdited", handleImageEdited)
    return () => window.removeEventListener("imageEdited", handleImageEdited)
  }, [])

  const handleSave = async () => {
    if (!image) return

    try {
      const response = await fetch("/api/save-edited-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      })

      if (!response.ok) throw new Error("Failed to save image")

      loadImage()
    } catch (error) {
      console.error("[v0] Error saving image:", error)
    }
  }

  const handleDelete = async () => {
    if (!image) return

    try {
      const response = await fetch("/api/delete-edited-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      })

      if (!response.ok) throw new Error("Failed to delete image")

      loadImage()
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
    }
  }

  const handleDownload = async () => {
    if (!image) return

    try {
      const response = await fetch(image.output_image_url)
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
      <Card className="border-border bg-card p-12 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  if (!image) {
    return (
      <Card className="border-border bg-card p-12 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Your most recent edit will appear here</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card overflow-hidden h-full flex flex-col">
      <div className="relative flex-1 bg-black min-h-[400px]">
        <Image src={image.output_image_url || "/placeholder.svg"} alt={image.prompt} fill className="object-contain" />
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{image.prompt}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={handleSave}>
            <Heart className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
