"use client"

import { ImageGenerator } from "@/components/image-generator"
import { VideoGenerator } from "@/components/video-generator"
import { ImageEditor } from "@/components/image-editor"
import { FeaturedRecentImage } from "@/components/featured-recent-image"
import { FeaturedRecentVideo } from "@/components/featured-recent-video"
import { FeaturedRecentEdit } from "@/components/featured-recent-edit"
import { Button } from "@/components/ui/button"
import { ImageIcon, VideoIcon, PencilIcon } from "lucide-react"

type TabType = "images" | "videos" | "editor"

interface CreationTabsProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export function CreationTabs({ activeTab, setActiveTab }: CreationTabsProps) {
  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-muted p-1">
          <Button
            variant={activeTab === "images" ? "default" : "ghost"}
            onClick={() => setActiveTab("images")}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Images
          </Button>
          <Button
            variant={activeTab === "videos" ? "default" : "ghost"}
            onClick={() => setActiveTab("videos")}
            className="gap-2"
          >
            <VideoIcon className="h-4 w-4" />
            Videos
          </Button>
          <Button
            variant={activeTab === "editor" ? "default" : "ghost"}
            onClick={() => setActiveTab("editor")}
            className="gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            Editor
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "images" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <ImageGenerator />
          </div>
          <div className="hidden lg:block">
            <FeaturedRecentImage />
          </div>
        </div>
      )}

      {activeTab === "videos" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <VideoGenerator />
          </div>
          <div className="hidden lg:block">
            <FeaturedRecentVideo />
          </div>
        </div>
      )}

      {activeTab === "editor" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <ImageEditor />
          </div>
          <div className="hidden lg:block">
            <FeaturedRecentEdit />
          </div>
        </div>
      )}
    </div>
  )
}
