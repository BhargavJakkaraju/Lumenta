/**
 * Speech-to-Text Provider
 * Uses ElevenLabs STT for converting audio streams to transcripts
 */

export interface TranscriptSegment {
  text: string
  startTime: number
  endTime: number
  confidence: number
}

export interface SpeechToTextProvider {
  transcribe(audioBlob: Blob): Promise<string>
  transcribeWithTimestamps(audioBlob: Blob): Promise<TranscriptSegment[]>
  transcribeStream(audioStream: MediaStream): Promise<AsyncGenerator<TranscriptSegment>>
  isConfigured(): boolean
}

// Fallback local STT (placeholder)
export class LocalSTTProvider implements SpeechToTextProvider {
  isConfigured(): boolean {
    return true // Always available (fallback)
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    // Placeholder - would use Web Speech API as fallback
    return "[Audio transcription not available - enable ElevenLabs STT]"
  }

  async transcribeWithTimestamps(audioBlob: Blob): Promise<TranscriptSegment[]> {
    return []
  }

  async *transcribeStream(audioStream: MediaStream): AsyncGenerator<TranscriptSegment> {
    // Placeholder streaming
    yield {
      text: "[Streaming transcription not available]",
      startTime: 0,
      endTime: 0,
      confidence: 0,
    }
  }
}

// ElevenLabs STT Provider
export class ElevenLabsSTTProvider implements SpeechToTextProvider {
  private config: { apiKey: string; baseUrl?: string }

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.config = config
  }

  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("ElevenLabs STT not configured")
    }

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.webm")

      const response = await fetch(
        `${this.config.baseUrl || "https://api.elevenlabs.io"}/v1/speech-to-text`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.config.apiKey,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.text || ""
    } catch (error) {
      console.error("ElevenLabs STT error:", error)
      throw error
    }
  }

  async transcribeWithTimestamps(audioBlob: Blob): Promise<TranscriptSegment[]> {
    if (!this.isConfigured()) {
      throw new Error("ElevenLabs STT not configured")
    }

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.webm")

      const response = await fetch(
        `${this.config.baseUrl || "https://api.elevenlabs.io"}/v1/speech-to-text?timestamp=true`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.config.apiKey,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Convert ElevenLabs format to our format
      return (result.segments || []).map((seg: any) => ({
        text: seg.text,
        startTime: seg.start || 0,
        endTime: seg.end || 0,
        confidence: seg.confidence || 0.9,
      }))
    } catch (error) {
      console.error("ElevenLabs STT with timestamps error:", error)
      return []
    }
  }

  async *transcribeStream(audioStream: MediaStream): AsyncGenerator<TranscriptSegment> {
    if (!this.isConfigured()) {
      throw new Error("ElevenLabs STT not configured")
    }

    // For streaming, we need to chunk audio and send to API
    const mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: "audio/webm",
    })

    const chunks: Blob[] = []
    let currentTime = 0
    let isStopped = false

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      isStopped = true
    }

    mediaRecorder.start(1000) // Collect data every 1 second

    // Stream continuously
    try {
      while (!isStopped && mediaRecorder.state !== "inactive") {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        if (chunks.length > 0) {
          const audioBlob = new Blob([...chunks], { type: "audio/webm" })
          chunks.length = 0 // Clear chunks after creating blob
          
          try {
            const segments = await this.transcribeWithTimestamps(audioBlob)
            
            for (const segment of segments) {
              if (segment.startTime >= currentTime) {
                yield segment
                currentTime = segment.endTime
              }
            }
          } catch (error) {
            console.debug("Stream transcription error:", error)
          }
        }
      }

      // Final transcription on stop
      if (chunks.length > 0) {
        const audioBlob = new Blob(chunks, { type: "audio/webm" })
        try {
          const segments = await this.transcribeWithTimestamps(audioBlob)
          
          for (const segment of segments) {
            if (segment.startTime >= currentTime) {
              yield segment
            }
          }
        } catch (error) {
          console.debug("Final transcription error:", error)
        }
      }
    } finally {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
      }
    }
  }
}

