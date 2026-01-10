"use client"

interface VideoFeedPlaceholderProps {
  label?: string
  isActive?: boolean
  onClick?: () => void
}

export function VideoFeedPlaceholder({ label = "Camera 1", isActive = false, onClick }: VideoFeedPlaceholderProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400 font-medium">{label}</p>
      <div
        onClick={onClick}
        className={`relative aspect-video rounded-lg overflow-hidden bg-zinc-800 border flex items-center justify-center transition-all ${
          isActive
            ? "border-white ring-2 ring-white/20 cursor-pointer"
            : "border-zinc-700 cursor-pointer hover:border-zinc-600"
        }`}
      >
        <p className="text-zinc-500 text-sm">Sample Video Feed</p>
      </div>
    </div>
  )
}

