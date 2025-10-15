"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Trash2, 
  Save, 
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  VideoIcon
} from "lucide-react"
import { DiamondIcon } from "@/components/ui/diamond-icon"

interface ImageDetail {
  id: string
  url: string
  prompt: string
  negative_prompt?: string
  width: number
  height: number
  model?: string
  created_at: string
  is_saved: boolean
}

interface ImageDetailClientProps {
  imageId: string
}

export function ImageDetailClient({ imageId }: ImageDetailClientProps) {
  const router = useRouter()

  const [image, setImage] = useState<ImageDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPrompt, setShowPrompt] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(`/api/media/${imageId}?metadata=true`)
        if (!response.ok) {
          throw new Error("Failed to load image")
        }
        const data = await response.json()
        setImage(data)
      } catch (err) {
        setError("Failed to load image details")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadImage()
  }, [imageId])

  const handleDownload = async () => {
    if (!image) return
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${image.prompt.slice(0, 30)}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const handleShare = async () => {
    if (!image) return
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    } catch (error) {
      console.error("Share error:", error)
    }
  }

  const handleSave = async () => {
    if (!image || image.is_saved) return
    setIsSaving(true)
    try {
      const response = await fetch("/api/save-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: image.id,
          imageUrl: image.url,
        }),
      })

      if (!response.ok) throw new Error("Failed to save image")

      setImage({ ...image, is_saved: true })
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!image) return
    if (!confirm("Are you sure you want to delete this image?")) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/delete-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      })

      if (!response.ok) throw new Error("Failed to delete image")

      router.push("/")
    } catch (error) {
      console.error("Delete error:", error)
      setIsDeleting(false)
    }
  }

  const handleClone = () => {
    if (!image) return
    const params = new URLSearchParams({
      prompt: image.prompt,
      width: image.width.toString(),
      height: image.height.toString(),
    })

    if (image.model) {
      params.append('model', image.model)
    }

    if (image.negative_prompt) {
      params.append('negative_prompt', image.negative_prompt)
    }

    router.push(`/?tab=images&${params.toString()}`)
  }

  const handleAnimate = () => {
    if (!image) return
    const params = new URLSearchParams({
      prompt: image.prompt,
      imageUrl: image.url,
    })

    router.push(`/?tab=videos&${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="border-0 bg-card/50 shadow-xl shadow-primary/5 p-8 rounded-2xl">
          <p className="text-center text-muted-foreground">{error || "Image not found"}</p>
          <Button onClick={() => router.push("/")} className="mt-4 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Card>
      </div>
    )
  }

  const aspectRatio = image.width / image.height

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 gap-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Image section - shows first on mobile, right on desktop */}
          <div className="flex-1 min-w-0 lg:order-2">
            <Card className="border-0 bg-card/50 shadow-xl shadow-primary/5 overflow-hidden rounded-2xl p-4 md:p-6">
              <div 
                className="relative bg-muted/30 rounded-xl overflow-hidden mx-auto flex items-center justify-center"
                style={{ 
                  aspectRatio: aspectRatio.toString(),
                  maxHeight: '70vh',
                  width: '100%'
                }}
              >
                <Image
                  src={image.url}
                  alt={image.prompt}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Card>
          </div>

          {/* Controls section - shows second on mobile, left on desktop */}
          <div className="lg:w-[420px] flex-shrink-0 space-y-4 lg:order-1 flex flex-col">
            {/* Prompt Details - appears first on desktop, third on mobile */}
            <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-xl shadow-primary/5 rounded-2xl overflow-hidden order-3 lg:order-1">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <span className="font-semibold">Prompt Details</span>
                {showPrompt ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>

              {showPrompt && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Positive Prompt</h3>
                    <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                      {image.prompt}
                    </p>
                  </div>

                  {image.negative_prompt && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Negative Prompt</h3>
                      <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                        {image.negative_prompt}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Info Card - appears second on desktop, first on mobile */}
            <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-xl shadow-primary/5 p-6 rounded-2xl order-1 lg:order-2">
              <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Dimensions:</span>
                  <span className="font-medium text-foreground">{image.width}×{image.height}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Model:</span>
                  <span className="font-medium text-foreground capitalize">{image.model ? image.model.replace(/_/g, ' ') : 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-foreground">
                    {new Date(image.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {image.is_saved && (
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="font-medium text-green-500 flex items-center gap-1">
                      <Save className="h-3 w-3" />
                      Saved
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleClone}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Clone
                  </Button>
                  <Button
                    onClick={handleAnimate}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-600/20"
                  >
                    <VideoIcon className="mr-2 h-4 w-4" />
                    Animate
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {!image.is_saved && (
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      variant="secondary"
                      className="backdrop-blur-sm bg-muted/50 border border-primary/10 hover:bg-muted/70"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  )}
                  <Button
                    onClick={handleShare}
                    variant="secondary"
                    className={`backdrop-blur-sm bg-muted/50 border border-primary/10 hover:bg-muted/70 ${!image.is_saved ? '' : 'col-span-2'}`}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Link
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="border-primary/20 hover:bg-muted/50"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    variant="outline"
                    className="border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-xl shadow-primary/5 p-4 rounded-2xl order-2 lg:order-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <DiamondIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p>
                  All content is AI-generated for entertainment purposes. Creating or sharing content based on real individuals is prohibited.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}