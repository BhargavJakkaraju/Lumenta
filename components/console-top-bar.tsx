"use client"

import type React from "react"

import { useRef } from "react"
import { Upload, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface ConsoleTopBarProps {
  feedCount: number
  isPlaying: boolean
  onAddClip: (file: File) => void
  onPlayPauseAll: () => void
}

export function ConsoleTopBar({
  feedCount,
  isPlaying,
  onAddClip,
  onPlayPauseAll,
}: ConsoleTopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      onAddClip(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="h-16 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md w-full">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-zinc-400 hover:text-white" />

        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <div className="flex items-center gap-1">
            <span className="text-white font-medium">{feedCount}</span>
            <span>feeds</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Add Camera
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPlayPauseAll}
          className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
