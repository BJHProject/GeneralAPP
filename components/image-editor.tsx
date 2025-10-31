"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Wand2, AlertCircle, Upload, X, ImageIcon } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { GalleryImageSelector } from "@/components/gallery-image-selector"
import { createClient } from "@/lib/supabase/client"
import { DiamondIcon } from "@/components/ui/diamond-icon"
import Image from "next/image"

export function ImageEditor() {
  const [prompt, setPrompt] = useState("")
  const [inputImage, setInputImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [showGallerySelector, setShowGallerySelector] = useState(false)
  const [galleryImageUrl, setGalleryImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setInputImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setGalleryImageUrl(null)
      setError(null)
    }
  }

  const handleGalleryImageSelect = async (imageUrl: string) => {
    console.log("[v0] Selected gallery image:", imageUrl)
    setGalleryImageUrl(imageUrl)
    setImagePreview(imageUrl)

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "gallery-image.png", { type: blob.type })
      setInputImage(file)
      setError(null)
    } catch (error) {
      console.error("[v0] Failed to load gallery image:", error)
      setError("Failed to load image from gallery")
    }
  }

  const removeImage = () => {
    setInputImage(null)
    setImagePreview(null)
    setGalleryImageUrl(null)
  }

  const handleEdit = async () => {
    if (!prompt.trim() || !inputImage) {
      setError("Please provide both an image and editing instructions")
      return
    }

    if (!user) {
      setShowAuthModal(true)
      return
    }

    console.log("[v0] Starting image editing from client")
    setIsGenerating(true)
    setError(null)
    setEditedImage(null)

    try {
      // If we have a gallery image URL, use it directly
      let imageUrl = galleryImageUrl

      // Otherwise, upload the image file first
      if (!imageUrl && inputImage) {
        console.log("[v0] Uploading image to Blob storage...")
        const formData = new FormData()
        formData.append("image", inputImage)

        const uploadResponse = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image")
        }

        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
        console.log("[v0] Image uploaded:", imageUrl)
      }

      if (!imageUrl) {
        throw new Error("No image URL available")
      }

      // Get image dimensions
      let width = 1024;
      let height = 1024;
      if (inputImage) {
        const img = new Promise<HTMLImageElement>((resolve, reject) => {
          const imageElement = new Image();
          imageElement.onload = () => resolve(imageElement);
          imageElement.onerror = reject;
          imageElement.src = URL.createObjectURL(inputImage);
        });
        const loadedImage = await img;
        width = loadedImage.width;
        height = loadedImage.height;
        URL.revokeObjectURL(loadedImage.src); // Clean up the object URL
      } else if (galleryImageUrl) {
        // If it's a gallery image, we might need to fetch dimensions differently
        // For simplicity, let's assume it's already handled or default
        // In a real app, you might fetch metadata or use a library
      }

      // Ensure minimum resolution of 1024x1024, maintaining aspect ratio
      const minResolution = 1024;
      let finalWidth = width;
      let finalHeight = height;

      if (width < minResolution || height < minResolution) {
        const aspectRatio = width / height;
        if (width < height) {
          finalWidth = minResolution;
          finalHeight = Math.round(minResolution / aspectRatio);
        } else {
          finalHeight = minResolution;
          finalWidth = Math.round(minResolution * aspectRatio);
        }
      }

      // Cap at 4096x4096 (optional, based on typical API limits)
      const maxResolution = 4096;
      if (finalWidth > maxResolution || finalHeight > maxResolution) {
        const aspectRatio = finalWidth / finalHeight;
        if (finalWidth > finalHeight) {
          finalWidth = maxResolution;
          finalHeight = Math.round(maxResolution / aspectRatio);
        } else {
          finalHeight = maxResolution;
          finalWidth = Math.round(maxResolution * aspectRatio);
        }
      }


      console.log("[v0] Sending edit request with image URL and dimensions:", { imageUrl, width: finalWidth, height: finalHeight })

      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          prompt: prompt.trim(),
          width: finalWidth,
          height: finalHeight,
        }),
      })

      console.log("[v0] Response status:", response.status)

      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit image")
      }

      console.log("[v0] Image editing successful")
      setEditedImage(data.url)
      window.dispatchEvent(new CustomEvent("imageEdited"))
    } catch (err) {
      console.error("[v0] Image editing error:", err)
      setError(err instanceof Error ? err.message : "Failed to edit image. Please try again.")
    } finally {
      setIsGenerating(false)
      console.log("[v0] Image editing complete")
    }
  }

  return (
    <div className="space-y-8">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <GalleryImageSelector
        isOpen={showGallerySelector}
        onClose={() => setShowGallerySelector(false)}
        onSelect={handleGalleryImageSelect}
      />

      <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-2xl shadow-primary/5 backdrop-blur-xl p-8">
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Input Image</Label>
            {!imagePreview ? (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer bg-secondary/30 hover:bg-secondary/50 transition-all backdrop-blur-sm">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 10MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setShowGallerySelector(true)}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Select from Gallery
                </Button>
              </div>
            ) : (
              <div className="relative w-full max-h-[70vh] aspect-video rounded-lg overflow-hidden bg-black">
                <Image src={imagePreview || "/placeholder.svg"} alt="Input preview" fill className="object-contain" />
                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removeImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-base font-semibold">
              Editing Instructions
            </Label>
            <Textarea
              id="prompt"
              placeholder="Turn this photo into a character figure. Behind it, place a box with the character's image printed on it..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none bg-secondary/50 text-foreground border-primary/10 backdrop-blur-sm focus:border-primary/30 transition-colors"
            />
          </div>

          <Button
            onClick={handleEdit}
            disabled={isGenerating || !prompt.trim() || !inputImage}
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Editing Image...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" />
                Edit Image (1,000 credits <DiamondIcon className="h-4 w-4 text-white inline ml-1" />)
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {editedImage && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Edited Image</Label>
              <div className="relative w-full max-h-[70vh] aspect-video rounded-lg overflow-hidden bg-black">
                <Image src={editedImage || "/placeholder.svg"} alt="Edited result" fill className="object-contain" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}