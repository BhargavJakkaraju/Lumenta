/**
 * Provider Coordinator
 * Manages all providers with fallbacks when advanced providers aren't configured
 */

import { LocalDetectionProvider, YOLOv8DetectionProvider } from "./detection-provider"
import { LocalVideoSearchProvider, TwelveLabsProvider } from "./video-understanding-provider"
import { LocalPreprocessingProvider, OpenCVPreprocessingProvider } from "./preprocessing-provider"
import { LocalFaceRecognitionProvider, ArcFaceONNXProvider } from "./arcface-provider"
import { LocalSTTProvider, ElevenLabsSTTProvider } from "./speech-to-text-provider"
import { LocalNodeGraphProvider, GeminiNodeGraphProvider } from "./gemini-nodegraph-provider"
import { LocalReasoningProvider, GeminiReasoningProvider } from "./gemini-reasoning-provider"
import { LocalOrchestrationProvider, GeminiMCPProvider } from "./gemini-mcp-provider"
import { loadProviderConfig, type ProviderConfig } from "./config"
// Import types directly from providers
import type { DetectionProvider } from "./detection-provider"
import type { PreprocessingProvider } from "./preprocessing-provider"
import type { FaceRecognitionProvider } from "./arcface-provider"
import type { SpeechToTextProvider } from "./speech-to-text-provider"
import type { NodeGraphProvider } from "./gemini-nodegraph-provider"
import type { ReasoningProvider } from "./letta-groq-provider"
import type { OrchestrationProvider } from "./gemini-mcp-provider"

// Re-export all provider types and interfaces
export type { DetectionProvider, DetectionResult } from "./detection-provider"
export type { VideoUnderstandingProvider, SearchResult } from "./video-understanding-provider"
export type { PreprocessingProvider } from "./preprocessing-provider"
export type { FaceRecognitionProvider, FaceEmbedding, IdentityMatch } from "./arcface-provider"
export type { SpeechToTextProvider, TranscriptSegment } from "./speech-to-text-provider"
export type { NodeGraphProvider, NodeGraphConfig } from "./gemini-nodegraph-provider"
export type { ReasoningProvider, ReasoningRequest, ReasoningResponse } from "./gemini-reasoning-provider"
export type { OrchestrationProvider, AgentTask, OrchestrationResult } from "./gemini-mcp-provider"
export type { ProviderConfig } from "./config"

// Provider Coordinator - uses fallbacks when advanced providers aren't configured
export class ProviderCoordinator {
  private config: ProviderConfig
  private detectionProvider: DetectionProvider
  private preprocessingProvider: PreprocessingProvider
  private faceRecognitionProvider: FaceRecognitionProvider
  private videoSearchProvider: VideoUnderstandingProvider
  private sttProvider: SpeechToTextProvider
  private nodeGraphProvider: NodeGraphProvider
  private reasoningProvider: ReasoningProvider
  private orchestrationProvider: OrchestrationProvider

  constructor(config?: ProviderConfig) {
    this.config = config || loadProviderConfig()
    // Initialize with fallbacks first
    this.detectionProvider = new LocalDetectionProvider()
    this.preprocessingProvider = new LocalPreprocessingProvider()
    this.faceRecognitionProvider = new LocalFaceRecognitionProvider()
    this.videoSearchProvider = new LocalVideoSearchProvider()
    this.sttProvider = new LocalSTTProvider()
    this.nodeGraphProvider = new LocalNodeGraphProvider()
    this.reasoningProvider = new LocalReasoningProvider()
    this.orchestrationProvider = new LocalOrchestrationProvider()
    
    // Async initialization will upgrade providers if configured
    this.initializeProviders().catch(console.error)
  }

  private async initializeProviders(): Promise<void> {
    // Detection Provider
    if (this.config.yolov8?.enabled && this.config.yolov8.modelPath) {
      try {
        const provider = new YOLOv8DetectionProvider({
          modelPath: this.config.yolov8.modelPath,
          inputSize: this.config.yolov8.inputSize,
          confidenceThreshold: this.config.yolov8.confidenceThreshold,
        })
        await provider.initialize()
        if (provider.isConfigured()) {
          this.detectionProvider = provider
        } else {
          this.detectionProvider = new LocalDetectionProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize YOLOv8, using local fallback:", error)
        this.detectionProvider = new LocalDetectionProvider()
      }
    } else {
      this.detectionProvider = new LocalDetectionProvider()
    }

    // Preprocessing Provider
    if (this.config.opencv?.enabled) {
      try {
        const provider = new OpenCVPreprocessingProvider()
        if (provider.isConfigured()) {
          this.preprocessingProvider = provider
        } else {
          this.preprocessingProvider = new LocalPreprocessingProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize OpenCV, using local fallback:", error)
        this.preprocessingProvider = new LocalPreprocessingProvider()
      }
    } else {
      this.preprocessingProvider = new LocalPreprocessingProvider()
    }

    // Face Recognition Provider
    if (this.config.arcface?.enabled && this.config.arcface.modelPath) {
      try {
        const provider = new ArcFaceONNXProvider(this.config.arcface.modelPath)
        await provider.initialize()
        if (provider.isConfigured()) {
          this.faceRecognitionProvider = provider
        } else {
          this.faceRecognitionProvider = new LocalFaceRecognitionProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize ArcFace, using local fallback:", error)
        this.faceRecognitionProvider = new LocalFaceRecognitionProvider()
      }
    } else {
      this.faceRecognitionProvider = new LocalFaceRecognitionProvider()
    }

    // Video Understanding Provider
    if (this.config.twelveLabs?.enabled && this.config.twelveLabs.apiKey) {
      try {
        const provider = new TwelveLabsProvider({
          apiKey: this.config.twelveLabs.apiKey,
          baseUrl: this.config.twelveLabs.baseUrl,
        })
        if (provider.isConfigured()) {
          this.videoSearchProvider = provider
        } else {
          this.videoSearchProvider = new LocalVideoSearchProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize Twelve Labs, using local fallback:", error)
        this.videoSearchProvider = new LocalVideoSearchProvider()
      }
    } else {
      this.videoSearchProvider = new LocalVideoSearchProvider()
    }

    // Speech-to-Text Provider
    if (this.config.elevenLabsSTT?.enabled && this.config.elevenLabsSTT.apiKey) {
      try {
        const provider = new ElevenLabsSTTProvider({
          apiKey: this.config.elevenLabsSTT.apiKey,
          baseUrl: this.config.elevenLabsSTT.baseUrl,
        })
        if (provider.isConfigured()) {
          this.sttProvider = provider
        } else {
          this.sttProvider = new LocalSTTProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize ElevenLabs STT, using local fallback:", error)
        this.sttProvider = new LocalSTTProvider()
      }
    } else {
      this.sttProvider = new LocalSTTProvider()
    }

    // Node Graph Provider
    if (this.config.geminiNodeGraph?.enabled && this.config.geminiNodeGraph.apiKey) {
      try {
        const provider = new GeminiNodeGraphProvider({
          apiKey: this.config.geminiNodeGraph.apiKey,
          baseUrl: this.config.geminiNodeGraph.baseUrl,
          model: this.config.geminiNodeGraph.model,
        })
        if (provider.isConfigured()) {
          this.nodeGraphProvider = provider
        } else {
          this.nodeGraphProvider = new LocalNodeGraphProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize Gemini Node Graph, using local fallback:", error)
        this.nodeGraphProvider = new LocalNodeGraphProvider()
      }
    } else {
      this.nodeGraphProvider = new LocalNodeGraphProvider()
    }

    // Reasoning Provider (Gemini)
    if (this.config.geminiReasoning?.enabled && this.config.geminiReasoning.apiKey) {
      try {
        const provider = new GeminiReasoningProvider({
          apiKey: this.config.geminiReasoning.apiKey,
          baseUrl: this.config.geminiReasoning.baseUrl,
          model: this.config.geminiReasoning.model,
        })
        if (provider.isConfigured()) {
          this.reasoningProvider = provider
        } else {
          this.reasoningProvider = new LocalReasoningProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize Gemini reasoning, using local fallback:", error)
        this.reasoningProvider = new LocalReasoningProvider()
      }
    } else {
      this.reasoningProvider = new LocalReasoningProvider()
    }

    // Orchestration Provider
    if (this.config.geminiMCP?.enabled && this.config.geminiMCP.apiKey) {
      try {
        const provider = new GeminiMCPProvider({
          apiKey: this.config.geminiMCP.apiKey,
          baseUrl: this.config.geminiMCP.baseUrl,
          model: this.config.geminiMCP.model,
        })
        if (provider.isConfigured()) {
          this.orchestrationProvider = provider
        } else {
          this.orchestrationProvider = new LocalOrchestrationProvider()
        }
      } catch (error) {
        console.warn("Failed to initialize Gemini MCP, using local fallback:", error)
        this.orchestrationProvider = new LocalOrchestrationProvider()
      }
    } else {
      this.orchestrationProvider = new LocalOrchestrationProvider()
    }
  }

  // Getters for providers
  getDetectionProvider(): DetectionProvider {
    return this.detectionProvider
  }

  getPreprocessingProvider(): PreprocessingProvider {
    return this.preprocessingProvider
  }

  getFaceRecognitionProvider(): FaceRecognitionProvider {
    return this.faceRecognitionProvider
  }

  getVideoSearchProvider(): VideoUnderstandingProvider {
    return this.videoSearchProvider
  }

  getSTTProvider(): SpeechToTextProvider {
    return this.sttProvider
  }

  getNodeGraphProvider(): NodeGraphProvider {
    return this.nodeGraphProvider
  }

  getReasoningProvider(): ReasoningProvider {
    return this.reasoningProvider
  }

  getOrchestrationProvider(): OrchestrationProvider {
    return this.orchestrationProvider
  }

  // Get status of all providers
  getStatus() {
    return {
      detection: this.detectionProvider.isConfigured() ? (this.config.yolov8?.enabled ? "yolov8" : "local") : "unconfigured",
      preprocessing: this.preprocessingProvider.isConfigured() ? (this.config.opencv?.enabled ? "opencv" : "local") : "unconfigured",
      faceRecognition: this.faceRecognitionProvider.isConfigured() ? (this.config.arcface?.enabled ? "arcface" : "local") : "unconfigured",
      videoSearch: this.videoSearchProvider.isConfigured() ? (this.config.twelveLabs?.enabled ? "twelve-labs" : "local") : "unconfigured",
      stt: this.sttProvider.isConfigured() ? (this.config.elevenLabsSTT?.enabled ? "elevenlabs" : "local") : "unconfigured",
      nodeGraph: this.nodeGraphProvider.isConfigured() ? (this.config.geminiNodeGraph?.enabled ? "gemini" : "local") : "unconfigured",
      reasoning: this.reasoningProvider.isConfigured() ? (this.config.geminiReasoning?.enabled ? "gemini-reasoning" : "local") : "unconfigured",
      orchestration: this.orchestrationProvider.isConfigured() ? (this.config.geminiMCP?.enabled ? "gemini-mcp" : "local") : "unconfigured",
    }
  }

  // Update configuration
  async updateConfig(config: Partial<ProviderConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.initializeProviders()
  }

  getConfig(): ProviderConfig {
    return { ...this.config }
  }
}

// Create singleton instance
export const providerCoordinator = new ProviderCoordinator()
