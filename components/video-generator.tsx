"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, VideoIcon, AlertCircle, Upload, X, ImageIcon, DiamondIcon } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { GalleryImageSelector } from "@/components/gallery-image-selector"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

export function VideoGenerator() {
  const searchParams = useSearchParams()
  
  const [prompt, setPrompt] = useState("")
  const [inputImage, setInputImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [duration, setDuration] = useState(3)
  const [style, setStyle] = useState<"lovely" | "express" | "express_hd" | "elite" | "elitist">("lovely")
  const steps = 4
  const seed = Math.floor(Math.random() * 1000000)
  const guidanceScale = 1
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showGallerySelector, setShowGallerySelector] = useState(false)
  const [galleryImageUrl, setGalleryImageUrl] = useState<string | null>(null)
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [eliteJobInfo, setEliteJobInfo] = useState<{ jobId: string; statusUrl: string; endpoint: string } | null>(null)

  useEffect(() => {
    const loadClonedData = async () => {
      if (searchParams) {
        const clonePrompt = searchParams.get('prompt')
        const cloneImageUrl = searchParams.get('imageUrl')

        if (clonePrompt) setPrompt(clonePrompt)
        
        if (cloneImageUrl) {
          setGalleryImageUrl(cloneImageUrl)
          setImagePreview(cloneImageUrl)

          try {
            const response = await fetch(cloneImageUrl)
            const blob = await response.blob()
            const file = new File([blob], "cloned-image.png", { type: blob.type })
            setInputImage(file)
          } catch (error) {
            console.error("[v0] Failed to load cloned image:", error)
          }
        }
      }
    }
    
    loadClonedData()
  }, [searchParams])

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

    // Convert URL to File object for API compatibility
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

  const handleGenerate = async () => {
    console.log("[v0] handleGenerate called")
    console.log(
      "[v0] Current state - prompt:",
      prompt.trim().length,
      "chars, inputImage:",
      !!inputImage,
      "user:",
      !!user,
    )

    if (!prompt.trim() || !inputImage) {
      console.log("[v0] Validation failed - missing prompt or image")
      setError("Please provide both an image and a prompt")
      return
    }

    if (!user) {
      console.log("[v0] User not authenticated, showing auth modal")
      setShowAuthModal(true)
      return
    }

    console.log("[v0] Starting video generation from client")
    console.log("[v0] Image file:", inputImage.name, inputImage.type, inputImage.size, "bytes")
    setIsGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", inputImage)
      formData.append("prompt", prompt.trim())
      formData.append("duration_seconds", duration.toString())
      formData.append("style", style)
      formData.append("steps", steps.toString())
      formData.append("guidance_scale", guidanceScale.toString())
      formData.append("randomize_seed", "true")
      formData.append("seed", Math.floor(Math.random() * 1000000).toString())

      console.log("[v0] Sending request to /api/generate-video")
      console.log("[v0] FormData contents:", {
        prompt: prompt.trim(),
        duration_seconds: duration,
        style,
        steps,
        guidance_scale: guidanceScale,
        imageSize: inputImage.size,
        imageType: inputImage.type,
      })

      const response = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      const contentType = response.headers.get("content-type")
      console.log("[v0] Content type:", contentType)

      let data
      if (contentType?.includes("application/json")) {
        data = await response.json()
        console.log("[v0] Response data:", data)
      } else {
        const text = await response.text()
        console.log("[v0] Response text:", text)
        throw new Error("Server returned non-JSON response: " + text.substring(0, 200))
      }

      if (!response.ok) {
        console.log("[v0] Response not OK, status:", response.status)
        if (response.status === 409) {
          throw new Error("Insufficient credits. Please add more credits to continue.")
        }
        throw new Error(data.error || "Failed to generate video")
      }

      if (data.status === "processing" && data.jobId && (style === "elite" || style === "elitist")) {
        console.log("[v0] Elite/Elitist job submitted, starting polling")
        setEliteJobInfo({ jobId: data.jobId, statusUrl: data.statusUrl, endpoint: data.endpoint })
        pollEliteJob(data.jobId, data.statusUrl, data.endpoint, style)
        return
      }

      console.log("[v0] Video generation successful")
      setGeneratedVideo(data.videoUrl)
      window.dispatchEvent(new CustomEvent("videoGenerated"))
      window.dispatchEvent(new CustomEvent("creditsChanged"))
    } catch (err) {
      console.error("[v0] Video generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate video. Please try again.")
      setIsGenerating(false)
    }
  }

  const pollEliteJob = async (
    jobId: string,
    statusUrl: string,
    endpoint: string,
    videoStyle: "elite" | "elitist",
  ) => {
    console.log("[v0] Polling Elite/Elitist job:", jobId, "style:", videoStyle)

    const maxAttempts = 30 // 2.5 minutes with 5 second intervals
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError("Video generation timed out. Please try again.")
        setIsGenerating(false)
        setEliteJobInfo(null)
        return
      }

      attempts++
      console.log(`[v0] Poll attempt ${attempts}/${maxAttempts}`)

      try {
        const formData = new FormData()
        formData.append("style", videoStyle)
        formData.append("elite_job_id", jobId)
        formData.append("elite_status_url", statusUrl)
        formData.append("elite_endpoint", endpoint)
        formData.append("prompt", prompt)
        formData.append("duration_seconds", duration.toString())

        const response = await fetch("/api/generate-video", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        console.log("[v0] Poll response:", data)

        if (data.status === "completed" && data.videoUrl) {
          console.log("[v0] Elite video completed!")
          setGeneratedVideo(data.videoUrl)
          setIsGenerating(false)
          setEliteJobInfo(null)
          window.dispatchEvent(new CustomEvent("videoGenerated"))
          window.dispatchEvent(new CustomEvent("creditsChanged"))
          return
        }

        if (data.status === "error") {
          throw new Error("Video generation failed")
        }

        // Continue polling
        setTimeout(poll, 5000)
      } catch (err) {
        console.error("[v0] Polling error:", err)
        setError(err instanceof Error ? err.message : "Failed to check video status")
        setIsGenerating(false)
        setEliteJobInfo(null)
      }
    }

    // Start polling after 5 seconds
    setTimeout(poll, 5000)
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
        <div className="space-y-8">
          {/* Style */}
          <div className="space-y-2">
            <Label htmlFor="style" className="text-base font-semibold">
              Video Style
            </Label>
            <Select
              value={style}
              onValueChange={(value) => {
                const newStyle = value as "lovely" | "express" | "express_hd" | "elite" | "elitist"
                setStyle(newStyle)
                // Reset duration to valid value for the new style
                if (newStyle === "express_hd") {
                  setDuration(5)
                } else if (newStyle === "express") {
                  setDuration(5)
                } else if (newStyle === "elite") {
                  setDuration(3)
                } else if (newStyle === "elitist") {
                  setDuration(3)
                } else {
                  setDuration(3)
                }
              }}
            >
              <SelectTrigger id="style" className="bg-secondary/50 border-primary/10 backdrop-blur-sm">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovely">Lovely</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="express_hd">Express HD</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="elitist">Elitist</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              Describe the video animation
            </Label>
            <Textarea
              id="prompt"
              placeholder="A person walking through a forest, camera following from behind..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none bg-secondary/50 text-foreground border-primary/10 backdrop-blur-sm focus:border-primary/30 transition-colors"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Duration</Label>
            {style === "express" ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={duration === 5 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(5)}
                >
                  5 seconds
                </Button>
                <Button
                  type="button"
                  variant={duration === 8 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(8)}
                >
                  8 seconds
                </Button>
              </div>
            ) : style === "express_hd" ? (
              <div className="flex gap-3">
                <Button type="button" variant="default" className="flex-1" disabled>
                  5 seconds
                </Button>
              </div>
            ) : style === "elite" ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={duration === 3 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(3)}
                >
                  3 seconds
                </Button>
                <Button
                  type="button"
                  variant={duration === 5 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(5)}
                >
                  5 seconds
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={duration === 1 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(1)}
                >
                  1 second
                </Button>
                <Button
                  type="button"
                  variant={duration === 3 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(3)}
                >
                  3 seconds
                </Button>
                <Button
                  type="button"
                  variant={duration === 5 ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDuration(5)}
                >
                  5 seconds
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !inputImage}
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <VideoIcon className="mr-2 h-5 w-5" />
                Generate Video (
                {duration === 1 ? "1,000" : duration === 3 ? "2,000" : duration === 5 ? "3,000" : "4,000"}{" "}
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
        </div>
      </Card>
    </div>
  )
}
