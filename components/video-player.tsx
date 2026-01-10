"use client"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface VideoPlayerProps {
  videoUrl: string
  feedName: string
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
}

export interface VideoPlayerRef {
  seek: (time: number) => void
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoUrl,
      feedName,
      onTimeUpdate,
      onDurationChange,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(true)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const updateTime = () => {
        setCurrentTime(video.currentTime)
        onTimeUpdate?.(video.currentTime)
      }

      const updateDuration = () => {
        setDuration(video.duration)
        onDurationChange?.(video.duration)
      }

      video.addEventListener("timeupdate", updateTime)
      video.addEventListener("loadedmetadata", updateDuration)
      video.addEventListener("durationchange", updateDuration)

      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false))
      } else {
        video.pause()
      }

      return () => {
        video.removeEventListener("timeupdate", updateTime)
        video.removeEventListener("loadedmetadata", updateDuration)
        video.removeEventListener("durationchange", updateDuration)
      }
    }, [isPlaying, onTimeUpdate, onDurationChange])

    useImperativeHandle(ref, () => ({
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time
          setCurrentTime(time)
          onTimeUpdate?.(time)
        }
      },
    }))

    const handleSeek = (value: number[]) => {
      const time = value[0]
      if (videoRef.current) {
        videoRef.current.currentTime = time
        setCurrentTime(time)
        onTimeUpdate?.(time)
      }
    }

    const handleVolumeChange = (value: number[]) => {
      const vol = value[0]
      setVolume(vol)
      if (videoRef.current) {
        videoRef.current.volume = vol
        setIsMuted(vol === 0)
      }
    }

    const toggleMute = () => {
      if (videoRef.current) {
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
      }
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const handleFullscreen = () => {
      if (videoRef.current) {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen()
        }
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
            muted={isMuted}
          />
          {/* Overlay Info */}
          <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-zinc-800">
            <h2 className="text-white font-semibold">{feedName}</h2>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-12">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-zinc-400 w-12">{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-zinc-300 hover:text-white"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-zinc-300 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="text-zinc-300 hover:text-white"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }
)
