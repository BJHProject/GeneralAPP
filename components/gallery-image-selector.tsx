"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import Image from "next/image"

interface GalleryImage {
  id: string
  url: string
  prompt: string
  width: number
  height: number
  created_at: string
  is_saved: boolean
}

interface GalleryImageSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageUrl: string) => void
}

export function GalleryImageSelector({ isOpen, onClose, onSelect }: GalleryImageSelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const loadImages = async () => {
    console.log("[v0] Loading images from API")
    setIsLoading(true)
    try {
      const response = await fetch("/api/images")
      console.log("[v0] API response status:", response.status)
      console.log("[v0] Content type:", response.headers.get("content-type"))
      if (!response.ok) {
        throw new Error("Failed to load images")
      }
      const data = await response.json()
      const allImages = data.images || []
      console.log("[v0] Received images:", allImages.length)
      // Filter to only unsaved images (recent generations) for video input
      const unsavedImages = allImages.filter((img: GalleryImage) => !img.is_saved)
      console.log("[v0] Filtered to unsaved images:", unsavedImages.length)
      setImages(unsavedImages)
    } catch (error) {
      console.error("[v0] Failed to load gallery images:", error)
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadImages()
      setSelectedImage(null)
    }
  }, [isOpen])

  const handleSelect = () => {
    if (selectedImage) {
      onSelect(selectedImage)
      onClose()
    }
  }

  const getImageObjectFit = (width: number, height: number) => {
    const aspectRatio = width / height
    return aspectRatio >= 0.9 ? "object-contain" : "object-cover"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Image from Gallery</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No recent images found. Generate some images first!</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => (
                <Card
                  key={image.id}
                  className={`cursor-pointer overflow-hidden border-2 transition-all ${
                    selectedImage === image.url
                      ? "border-primary ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedImage(image.url)}
                >
                  <div className="relative aspect-square overflow-hidden bg-black">
                    <Image
                      src={image.url || "/placeholder.svg"}
                      alt={image.prompt}
                      fill
                      className={getImageObjectFit(image.width, image.height)}
                    />
                    {selectedImage === image.url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs text-muted-foreground" title={image.prompt}>
                      {image.prompt}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSelect} disabled={!selectedImage}>
                Use Selected Image
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
