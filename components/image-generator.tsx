"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Wand2, AlertCircle } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { createClient } from "@/lib/supabase/client"
import { DiamondIcon } from "@/components/ui/diamond-icon"
import { Progress } from "@/components/ui/progress"
import { MODEL_REGISTRY } from "@/lib/ai-client/model-registry"

const PRESET_RESOLUTIONS = [
  { label: "Portrait", ratio: "2:3", width: 832, height: 1216 },
  { label: "Square", ratio: "1:1", width: 1024, height: 1024 },
  { label: "Landscape", ratio: "3:2", width: 1216, height: 832 },
]

export function ImageGenerator() {
  const searchParams = useSearchParams()
  
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("realistic")
  const [negativePrompt, setNegativePrompt] = useState(
    "(low quality, worst quality:1.2), very displeasing, 3d, watermark, signature, ugly, poorly drawn"
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageWidth, setImageWidth] = useState(832)
  const [imageHeight, setImageHeight] = useState(1216)
  const [selectedResolution, setSelectedResolution] = useState(0)
  const [guidanceScale, setGuidanceScale] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!searchParams) return
    
    const clonePrompt = searchParams.get('prompt')
    const cloneNegativePrompt = searchParams.get('negative_prompt')
    const cloneModel = searchParams.get('model')
    const cloneWidth = searchParams.get('width')
    const cloneHeight = searchParams.get('height')

    if (clonePrompt) setPrompt(clonePrompt)
    if (cloneNegativePrompt) setNegativePrompt(cloneNegativePrompt)
    if (cloneModel) setModel(cloneModel)
    
    if (cloneWidth && cloneHeight) {
      const width = parseInt(cloneWidth)
      const height = parseInt(cloneHeight)
      setImageWidth(width)
      setImageHeight(height)
      
      const presetIndex = PRESET_RESOLUTIONS.findIndex(
        preset => preset.width === width && preset.height === height
      )
      if (presetIndex !== -1) {
        setSelectedResolution(presetIndex)
      }
    }
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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isGenerating) {
      setProgress(0)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) {
            return prev + Math.random() * 3
          } else if (prev < 95) {
            return prev + 0.5
          }
          return prev
        })
      }, 500)
    } else {
      setProgress(100)
      setTimeout(() => setProgress(0), 500)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating])

  const handleResolutionChange = (index: number) => {
    const preset = PRESET_RESOLUTIONS[index]
    setSelectedResolution(index)
    setImageWidth(preset.width)
    setImageHeight(preset.height)
    setError(null)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    if (!user) {
      setShowAuthModal(true)
      return
    }

    console.log("[v0] Starting image generation from client")
    setIsGenerating(true)
    setError(null)

    try {
      const requestBody = {
        model,
        prompt: prompt.trim(),
        negative_prompt: negativePrompt,
        width: imageWidth,
        height: imageHeight,
        guidance_scale: guidanceScale,
      }

      console.log("[v0] Sending request to /api/generate:", requestBody)

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate images")
      }

      if (data.isAsync && data.requestId) {
        console.log("[v0] Async generation started, polling for results...")
        await pollForWavespeedResults(data.requestId)
      } else {
        console.log("[v0] Image generation successful, dispatching event")
        window.dispatchEvent(new CustomEvent("imageGenerated"))
      }
    } catch (err) {
      console.error("[v0] Image generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate images. Please try again.")
    } finally {
      setIsGenerating(false)
      console.log("[v0] Image generation complete")
    }
  }

  const pollForWavespeedResults = async (requestId: string) => {
    console.log("[v0] ========== STARTING WAVESPEED POLLING ==========")
    console.log("[v0] Request ID:", requestId)
    const maxAttempts = 120
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++
      console.log(`[v0] ========== POLL ATTEMPT ${attempts}/${maxAttempts} ==========`)

      await new Promise((resolve) => setTimeout(resolve, 5000))

      try {
        console.log("[v0] Sending poll request to /api/poll-wavespeed")
        const pollResponse = await fetch("/api/poll-wavespeed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requestId }),
        })

        console.log("[v0] Poll response status:", pollResponse.status)
        console.log("[v0] Poll response ok:", pollResponse.ok)

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text()
          console.error("[v0] Poll request failed with error:", errorText)
          continue
        }

        const pollData = await pollResponse.json()
        console.log("[v0] Poll response data:", JSON.stringify(pollData, null, 2))

        console.log("[v0] Status:", pollData.status)
        console.log("[v0] Outputs:", pollData.outputs)
        console.log("[v0] Error:", pollData.error)

        if (pollData.status === "completed" || pollData.status === "succeeded") {
          console.log("[v0] Generation completed! Status:", pollData.status)

          if (pollData.outputs && pollData.outputs.length > 0) {
            console.log("[v0] Found", pollData.outputs.length, "output(s)")
            console.log("[v0] Processing results...")

            const supabase = createClient()
            const imageRecords = pollData.outputs.map((url: string) => ({
              user_id: user.id,
              url,
              prompt: prompt.trim(),
              width: imageWidth,
              height: imageHeight,
              is_saved: false,
            }))

            console.log("[v0] Saving", imageRecords.length, "image(s) to database")
            const { error: insertError } = await supabase.from("images").insert(imageRecords)

            if (insertError) {
              console.error("[v0] Failed to save images:", insertError)
              throw new Error("Failed to save images to database")
            } else {
              console.log("[v0] Images saved successfully!")
              console.log("[v0] Dispatching imageGenerated event")
              window.dispatchEvent(new CustomEvent("imageGenerated"))
            }

            return
          } else {
            console.warn("[v0] Status is completed but no outputs found, continuing to poll...")
          }
        } else if (pollData.status === "failed") {
          console.error("[v0] Generation failed with error:", pollData.error)
          throw new Error(pollData.error || "Generation failed")
        } else {
          console.log("[v0] Status is", pollData.status, "- continuing to poll...")
        }
      } catch (err) {
        console.error("[v0] Polling error:", err)
        if (attempts >= maxAttempts) {
          console.error("[v0] Max attempts reached, giving up")
          throw err
        }
        console.log("[v0] Continuing to next attempt...")
      }
    }

    console.error("[v0] Polling timed out after", maxAttempts, "attempts")
    throw new Error("Generation timed out. Please try again.")
  }

  return (
    <div className="space-y-8">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <Card className="border-0 bg-gradient-to-br from-card/50 to-muted/30 shadow-2xl shadow-primary/5 backdrop-blur-xl p-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="model" className="text-base font-semibold">
              Model Style
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="bg-secondary/50 border-primary/10 backdrop-blur-sm">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="realistic_w">Realistic W</SelectItem>
                <SelectItem value="realistic_v2">Realistic V2</SelectItem>
                <SelectItem value="realistic_s">Realistic S</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="anime_v2">Anime V2</SelectItem>
                <SelectItem value="anime_v3">Anime V3</SelectItem>
                <SelectItem value="anime_pd">Anime PD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-base font-semibold">
              Describe your image
            </Label>
            <Textarea
              id="prompt"
              placeholder="A serene landscape with mountains at sunset, vibrant colors, highly detailed..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none bg-secondary/50 text-foreground border-primary/10 backdrop-blur-sm focus:border-primary/30 transition-colors"
            />
          </div>

          {MODEL_REGISTRY[model]?.supportsNegativePrompt !== false && (
            <div className="space-y-2">
              <Label htmlFor="negative-prompt" className="text-base font-semibold">
                Negative Prompt (Optional)
              </Label>
              <Textarea
                id="negative-prompt"
                placeholder="What you DON'T want to see in the image..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[80px] resize-none bg-secondary/50 text-foreground border-primary/10 backdrop-blur-sm focus:border-primary/30 transition-colors"
              />
            </div>
          )}

          <div className="space-y-2 mb-6">
            <Label className="text-base font-semibold">Adherence to prompt</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={guidanceScale === 4.5 ? "default" : "outline"}
                onClick={() => setGuidanceScale(4.5)}
                className={`h-auto py-2 rounded-lg transition-all text-sm ${guidanceScale === 4.5 ? "shadow-lg shadow-primary/30" : "border-primary/10 hover:border-primary/30"}`}
              >
                Creative
              </Button>
              <Button
                variant={guidanceScale === 7 ? "default" : "outline"}
                onClick={() => setGuidanceScale(7)}
                className={`h-auto py-2 rounded-lg transition-all text-sm ${guidanceScale === 7 ? "shadow-lg shadow-primary/30" : "border-primary/10 hover:border-primary/30"}`}
              >
                Standard
              </Button>
              <Button
                variant={guidanceScale === 10 ? "default" : "outline"}
                onClick={() => setGuidanceScale(10)}
                className={`h-auto py-2 rounded-lg transition-all text-sm ${guidanceScale === 10 ? "shadow-lg shadow-primary/30" : "border-primary/10 hover:border-primary/30"}`}
              >
                Strict
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Higher values follow your prompt more closely, lower values allow more creative freedom
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Resolution</Label>
            <div className="grid grid-cols-3 gap-4">
              {PRESET_RESOLUTIONS.map((preset, index) => {
                const isLandscape = preset.width > preset.height
                const isSquare = preset.width === preset.height
                const iconWidth = isLandscape ? 20 : isSquare ? 16 : 12
                const iconHeight = isLandscape ? 12 : isSquare ? 16 : 20

                return (
                  <Button
                    key={index}
                    variant={selectedResolution === index ? "default" : "outline"}
                    onClick={() => handleResolutionChange(index)}
                    className={`flex flex-col items-center gap-2 h-auto py-3 rounded-xl transition-all ${selectedResolution === index ? "shadow-lg shadow-primary/30" : "border-primary/10 hover:border-primary/30"}`}
                  >
                    <div
                      className="border-2 border-current"
                      style={{
                        width: `${iconWidth}px`,
                        height: `${iconHeight}px`,
                      }}
                    />
                    <div className="hidden md:flex flex-col items-center gap-0.5">
                      <span className="font-semibold text-sm">{preset.label}</span>
                      <span className="text-xs opacity-80">{preset.ratio}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {imageWidth} × {imageHeight} pixels
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isGenerating && progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">Generating your masterpiece...</p>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" />
                Generate Image (500 credits <DiamondIcon className="h-4 w-4 text-white inline ml-1" />)
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
