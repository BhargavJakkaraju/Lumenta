"use client"

import type React from "react"

import { useRef } from "react"
import { Upload, Play, Pause, Trash2, Shield, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface ConsoleTopBarProps {
  feedCount: number
  incidentCount: number
  privacyMode: boolean
  isPlaying: boolean
  onTogglePrivacy: () => void
  onAddClip: (file: File) => void
  onPlayPauseAll: () => void
  onClearIncidents: () => void
}

export function ConsoleTopBar({
  feedCount,
  incidentCount,
  privacyMode,
  isPlaying,
  onTogglePrivacy,
  onAddClip,
  onPlayPauseAll,
  onClearIncidents,
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
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-1">
            <span className="text-white font-medium">{incidentCount}</span>
            <span>open</span>
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
          Add Clip
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPlayPauseAll}
          className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearIncidents}
          className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePrivacy}
          className={`border-zinc-700 ${
            privacyMode
              ? "bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {privacyMode ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
