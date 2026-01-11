"use client"

import { useParams, useRouter } from "next/navigation"
import { CameraDetailView } from "@/components/camera-detail-view"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CameraDetailPage() {
  const params = useParams()
  const router = useRouter()
  const feedId = params.id as string

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      <div className="h-16 border-b border-zinc-800 px-4 flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            ;(window as any).__lumentaPauseProcessing = true
            router.push("/console")
          }}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feeds
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CameraDetailView feedId={feedId} />
      </div>
    </div>
  )
}
