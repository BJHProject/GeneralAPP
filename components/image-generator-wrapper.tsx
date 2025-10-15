"use client"

import { Suspense } from "react"
import { ImageGenerator } from "./image-generator"

export function ImageGeneratorWrapper() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-2xl" />}>
      <ImageGenerator />
    </Suspense>
  )
}
