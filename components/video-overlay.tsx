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
  showMotionOverlay?: boolean
}

export function VideoOverlay({
  videoElement,
  events,
  currentTime,
  videoWidth,
  videoHeight,
  showMotionOverlay = true,
}: VideoOverlayProps) {
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
    const activeEvents = events.filter((event) => {
      if (!showMotionOverlay && event.overlayOnly) return false
      return Math.abs(event.timestamp - currentTime) < 0.5 && event.box
    })

    // Calculate displayed video area inside the canvas (object-contain)
    const videoAspect = videoWidth / videoHeight
    const canvasAspect = canvas.width / canvas.height
    const displayWidth =
      canvasAspect > videoAspect ? canvas.height * videoAspect : canvas.width
    const displayHeight =
      canvasAspect > videoAspect ? canvas.height : canvas.width / videoAspect
    const offsetX = (canvas.width - displayWidth) / 2
    const offsetY = (canvas.height - displayHeight) / 2

    // Clip to video area so overlays don't bleed into letterbox bars
    ctx.save()
    ctx.beginPath()
    ctx.rect(offsetX, offsetY, displayWidth, displayHeight)
    ctx.clip()

    // Calculate scale factors (video actual size vs displayed size)
    const scaleX = displayWidth / videoWidth
    const scaleY = displayHeight / videoHeight

    const overlayDots = activeEvents
      .filter((event) => event.overlayOnly && event.box)
      .map((event) => {
        const { x, y, width, height } = event.box as NonNullable<VideoEvent["box"]>
        const scaledX = x * scaleX
        const scaledY = y * scaleY
        const scaledWidth = width * scaleX
        const scaledHeight = height * scaleY
        return {
          x: offsetX + scaledX + scaledWidth / 2,
          y: offsetY + scaledY + scaledHeight / 2,
          r: Math.max(2, Math.min(scaledWidth, scaledHeight) / 2),
        }
      })

    const linkDistance = 64
    if (overlayDots.length > 1) {
      ctx.strokeStyle = "rgba(34, 211, 238, 0.4)"
      ctx.lineWidth = 1
      for (let i = 0; i < overlayDots.length; i++) {
        const a = overlayDots[i]
        for (let j = i + 1; j < overlayDots.length; j++) {
          const b = overlayDots[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          if (dx * dx + dy * dy <= linkDistance * linkDistance) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
    }

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
      if (event.type === "alert") color = "#2563eb"
      if (event.overlayOnly) color = "#22d3ee"

      if (event.overlayOnly) {
        const dotX = offsetX + scaledX + scaledWidth / 2
        const dotY = offsetY + scaledY + scaledHeight / 2
        const dotRadius = 2
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2)
        ctx.fill()
        return
      }

      // Draw bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(offsetX + scaledX, offsetY + scaledY, scaledWidth, scaledHeight)

      // Draw label background
      const label = event.identity
        ? `${event.type} (${event.identity})`
        : event.type
      const confidence = Math.round(event.confidence * 100)

      ctx.fillStyle = color
      ctx.fillRect(offsetX + scaledX, offsetY + scaledY - 20, Math.max(120, label.length * 8), 20)

      // Draw label text
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px sans-serif"
      ctx.fillText(`${label} ${confidence}%`, offsetX + scaledX + 4, offsetY + scaledY - 5)

      // Draw identity badge if recognized
      if (event.identity) {
        ctx.fillStyle = "#10b981" // green
        ctx.beginPath()
        ctx.arc(offsetX + scaledX + scaledWidth - 10, offsetY + scaledY + 10, 8, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    ctx.restore()
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
