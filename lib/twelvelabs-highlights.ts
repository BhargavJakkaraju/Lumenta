/**
 * TwelveLabs Video Highlights
 * Generates chapter timestamps from video URLs using TwelveLabs API
 */

export interface Chapter {
  start: number // Start time in seconds
  title: string // Chapter title/description
}

export interface VideoHighlightsResult {
  chapters: Chapter[]
  videoId: string
}

/**
 * Generate video highlights (chapters) from a video URL using TwelveLabs
 */
export async function generateVideoHighlights(videoUrl: string, feedId: string): Promise<VideoHighlightsResult> {
  try {
    const response = await fetch("/api/video-highlights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl,
        feedId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to generate video highlights")
    }

    const data = await response.json()
    return {
      chapters: data.chapters || [],
      videoId: data.videoId || feedId,
    }
  } catch (error: any) {
    console.error("Error generating video highlights:", error)
    throw error
  }
}

/**
 * Get video highlights for an already indexed video
 */
export async function getVideoHighlights(videoId: string): Promise<VideoHighlightsResult> {
  try {
    const response = await fetch(`/api/video-highlights?videoId=${encodeURIComponent(videoId)}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to fetch video highlights")
    }

    const data = await response.json()
    return {
      chapters: data.chapters || [],
      videoId: data.videoId || videoId,
    }
  } catch (error: any) {
    console.error("Error fetching video highlights:", error)
    throw error
  }
}

