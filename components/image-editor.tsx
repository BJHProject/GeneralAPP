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
      const formData = new FormData()
      formData.append("image", inputImage)
      formData.append("prompt", prompt.trim())

      console.log("[v0] Sending request to /api/edit-image")

      const response = await fetch("/api/edit-image", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Response status:", response.status)

      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit image")
      }

      console.log("[v0] Image editing successful")
      setEditedImage(data.imageUrl)
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

      <Card className="border-border bg-card p-6">
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Input Image</Label>
            {!imagePreview ? (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors">
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
              className="min-h-[120px] resize-none bg-secondary text-foreground"
            />
          </div>

          <Button
            onClick={handleEdit}
            disabled={isGenerating || !prompt.trim() || !inputImage}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
                Edit Image (1,000
                <DiamondIcon className="h-3.5 w-3.5 text-pink-300 inline" />)
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
