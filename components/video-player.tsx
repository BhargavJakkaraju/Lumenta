"use client"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { Volume2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface VideoPlayerProps {
  videoUrl: string
  feedName: string
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  overlay?: React.ReactNode
}

export interface VideoPlayerRef {
  seek: (time: number) => void
  getVideoElement: () => HTMLVideoElement | null
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoUrl,
      feedName,
      onTimeUpdate,
      onDurationChange,
      overlay,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [volume, setVolume] = useState(1)

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const updateTime = () => {
        onTimeUpdate?.(video.currentTime)
      }

      const updateDuration = () => {
        onDurationChange?.(video.duration)
      }

      video.addEventListener("timeupdate", updateTime)
      video.addEventListener("loadedmetadata", updateDuration)

      video.play().catch(() => null)

      return () => {
        video.removeEventListener("timeupdate", updateTime)
        video.removeEventListener("loadedmetadata", updateDuration)
      }
    }, [onTimeUpdate, onDurationChange])

    useImperativeHandle(ref, () => ({
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time
          onTimeUpdate?.(time)
        }
      },
      getVideoElement: () => videoRef.current,
    }))

    const handleVolumeChange = (value: number[]) => {
      const vol = value[0]
      setVolume(vol)
      if (videoRef.current) {
        videoRef.current.volume = vol
      }
    }

    return (
      <div className="h-full flex flex-col bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden min-h-0">
        {/* Video Container */}
        <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            loop
            muted={false}
            crossOrigin="anonymous"
          />
          {/* Overlay Info */}
          <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-zinc-800 z-20">
            <h2 className="text-white font-semibold">{feedName}</h2>
          </div>
          {overlay ? <div className="absolute inset-0 pointer-events-none z-20">{overlay}</div> : null}
        </div>

        {/* Controls */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-300" />
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-32"
            />
          </div>
        </div>
      </div>
    )
  }
)
