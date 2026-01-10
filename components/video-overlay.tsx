/**
 * Video Overlay Component
 * Draws bounding boxes and labels on video feed
 */

"use client"

import { useEffect, useRef } from "react"
import type { VideoEvent } from "@/types/lumenta"

interface VideoOverlayProps {
  videoElement: HTMLVideoElement | null
  events: VideoEvent[]
  currentTime: number
  videoWidth: number
  videoHeight: number
}

export function VideoOverlay({ videoElement, events, currentTime, videoWidth, videoHeight }: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !videoElement) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Match canvas size to video display size
    const rect = videoElement.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Get events for current time (±0.5 seconds)
    const activeEvents = events.filter(
      (event) => Math.abs(event.timestamp - currentTime) < 0.5 && event.box
    )

    // Calculate scale factors (video actual size vs displayed size)
    const scaleX = canvas.width / videoWidth
    const scaleY = canvas.height / videoHeight

    // Draw bounding boxes and labels
    activeEvents.forEach((event) => {
      if (!event.box) return

      const { x, y, width, height } = event.box

      // Scale box coordinates
      const scaledX = x * scaleX
      const scaledY = y * scaleY
      const scaledWidth = width * scaleX
      const scaledHeight = height * scaleY

      // Choose color based on severity
      let color = "#3b82f6" // blue (low)
      if (event.severity === "medium") color = "#f59e0b" // orange
      if (event.severity === "high") color = "#ef4444" // red

      // Draw bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight)

      // Draw label background
      const label = event.identity
        ? `${event.type} (${event.identity})`
        : event.type
      const confidence = Math.round(event.confidence * 100)

      ctx.fillStyle = color
      ctx.fillRect(scaledX, scaledY - 20, Math.max(120, label.length * 8), 20)

      // Draw label text
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px sans-serif"
      ctx.fillText(`${label} ${confidence}%`, scaledX + 4, scaledY - 5)

      // Draw identity badge if recognized
      if (event.identity) {
        ctx.fillStyle = "#10b981" // green
        ctx.beginPath()
        ctx.arc(scaledX + scaledWidth - 10, scaledY + 10, 8, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [videoElement, events, currentTime, videoWidth, videoHeight])

  if (!videoElement) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  )
}

