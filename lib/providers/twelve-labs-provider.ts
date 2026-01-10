/**
 * Twelve Labs Video Understanding Provider
 * High-level video analysis for richer contextual understanding
 */

import type { VideoUnderstandingProvider, SearchResult } from "./video-understanding-provider"

export interface TwelveLabsConfig {
  apiKey: string
  baseUrl?: string
}

// Twelve Labs Implementation
export class TwelveLabsProvider implements VideoUnderstandingProvider {
  private config: TwelveLabsConfig
  private videoIndexMap: Map<string, string> = new Map() // videoId -> indexId

  constructor(config: TwelveLabsConfig) {
    this.config = config
  }

  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  async indexVideo(videoId: string, videoUrl: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Twelve Labs not configured")
    }

    try {
      // Create video index
      const response = await fetch(`${this.config.baseUrl || "https://api.twelvelabs.io"}/v1.2/indexes`, {
        method: "POST",
        headers: {
          "x-api-key": this.config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          index_name: `lumenta_${videoId}`,
          engines: [
            {
              engine_name: "marengo2.6",
              engine_options: ["visual", "conversation", "text_in_video", "logo"],
            },
          ],
        }),
      })

      const index = await response.json()
      const indexId = index._id

      // Upload video to index
      const uploadResponse = await fetch(
        `${this.config.baseUrl || "https://api.twelvelabs.io"}/v1.2/tasks`,
        {
          method: "POST",
          headers: {
            "x-api-key": this.config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            index_id: indexId,
            language: "en",
            video_url: videoUrl,
            transcription_file_url: null,
          }),
        }
      )

      const task = await uploadResponse.json()
      this.videoIndexMap.set(videoId, indexId)

      return indexId
    } catch (error) {
      console.error("Twelve Labs indexing error:", error)
      throw error
    }
  }

  async searchMoments(query: string, videoId: string): Promise<SearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error("Twelve Labs not configured")
    }

    const indexId = this.videoIndexMap.get(videoId)
    if (!indexId) {
      throw new Error(`Video ${videoId} not indexed`)
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl || "https://api.twelvelabs.io"}/v1.2/search`,
        {
          method: "POST",
          headers: {
            "x-api-key": this.config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            index_id: indexId,
            search_options: ["visual", "conversation", "text_in_video"],
            filter: {},
          }),
        }
      )

      const results = await response.json()

      return results.data.map((item: any) => ({
        timestamp: item.start_time || 0,
        confidence: item.confidence || 0.8,
        description: item.metadata?.description || query,
      }))
    } catch (error) {
      console.error("Twelve Labs search error:", error)
      return []
    }
  }

  async getSummary(videoId: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Twelve Labs not configured")
    }

    const indexId = this.videoIndexMap.get(videoId)
    if (!indexId) {
      throw new Error(`Video ${videoId} not indexed`)
    }

    try {
      // Use search with broad query to get video context
      const response = await fetch(
        `${this.config.baseUrl || "https://api.twelvelabs.io"}/v1.2/search`,
        {
          method: "POST",
          headers: {
            "x-api-key": this.config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: "summarize this video",
            index_id: indexId,
            search_options: ["visual", "conversation"],
            filter: {},
          }),
        }
      )

      const results = await response.json()

      if (results.data && results.data.length > 0) {
        return results.data[0].metadata?.description || "No summary available"
      }

      return "No summary available"
    } catch (error) {
      console.error("Twelve Labs summary error:", error)
      return "Error generating summary"
    }
  }
}

