"use client"

import { Suspense } from "react"
import { VideoGenerator } from "./video-generator"

export function VideoGeneratorWrapper() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-2xl" />}>
      <VideoGenerator />
    </Suspense>
  )
}
