"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { CreationTabs } from "@/components/creation-tabs"
import { RecentGenerations } from "@/components/recent-generations"
import { RecentVideos } from "@/components/recent-videos"
import { RecentEdits } from "@/components/recent-edits"
import { Header } from "@/components/header"

export default function Home() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"images" | "videos" | "editor">("images")

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'images' || tab === 'videos' || tab === 'editor') {
      setActiveTab(tab)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl text-balance">
              Create Stunning Images with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
              Transform your ideas into beautiful visuals. Powered by advanced AI technology to bring your imagination
              to life.
            </p>
          </div>

          <CreationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="mx-auto lg:max-w-full">
            {activeTab === "images" && <RecentGenerations />}
            {activeTab === "videos" && <RecentVideos />}
            {activeTab === "editor" && <RecentEdits />}
          </div>

          {activeTab === "images" && (
            <p className="text-sm text-muted-foreground text-center">
              Only your last 10 generated images are kept in history. Save images to keep them permanently.
            </p>
          )}
          {activeTab === "videos" && (
            <p className="text-sm text-muted-foreground text-center">
              Only your last 10 generated videos are kept in history. Save videos to keep them permanently.
            </p>
          )}
          {activeTab === "editor" && (
            <p className="text-sm text-muted-foreground text-center">
              Only your last 10 edited images are kept in history. Save edits to keep them permanently.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
