export interface VideoUnderstandingProvider {
  searchMoments(query: string, videoId: string): Promise<SearchResult[]>
  getSummary(videoId: string): Promise<string>
  isConfigured(): boolean
}

export interface SearchResult {
  timestamp: number
  confidence: number
  description: string
}

// Fallback local search (keyword-based)
export class LocalVideoSearchProvider implements VideoUnderstandingProvider {
  private incidents: Map<string, Array<{ timestamp: number; description: string }>> = new Map()

  isConfigured(): boolean {
    return true
  }

  async searchMoments(query: string, videoId: string): Promise<SearchResult[]> {
    // Simple keyword matching in incident descriptions
    const videoIncidents = this.incidents.get(videoId) || []
    return videoIncidents
      .filter((inc) => inc.description.toLowerCase().includes(query.toLowerCase()))
      .map((inc) => ({
        timestamp: inc.timestamp,
        confidence: 75,
        description: inc.description,
      }))
  }

  async getSummary(videoId: string): Promise<string> {
    const videoIncidents = this.incidents.get(videoId) || []
    return `${videoIncidents.length} incidents detected in this feed.`
  }
}

// Placeholder for TwelveLabs integration
export class TwelveLabsProvider implements VideoUnderstandingProvider {
  isConfigured(): boolean {
    return false
  }

  async searchMoments(query: string, videoId: string): Promise<SearchResult[]> {
    throw new Error("TwelveLabs not configured")
  }

  async getSummary(videoId: string): Promise<string> {
    throw new Error("TwelveLabs not configured")
  }
}
