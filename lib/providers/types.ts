/**
 * Provider Type Exports
 * Central type definitions for all providers
 */

export type { DetectionProvider, DetectionResult } from "./detection-provider"
export type { VideoUnderstandingProvider, SearchResult } from "./video-understanding-provider"
export type { PreprocessingProvider } from "./preprocessing-provider"
export type { FaceRecognitionProvider, FaceEmbedding, IdentityMatch } from "./arcface-provider"
export type { SpeechToTextProvider, TranscriptSegment } from "./speech-to-text-provider"
export type { NodeGraphProvider, NodeGraphConfig } from "./gemini-nodegraph-provider"
export type { ReasoningProvider, ReasoningRequest, ReasoningResponse } from "./gemini-reasoning-provider"
export type { OrchestrationProvider, AgentTask, OrchestrationResult } from "./gemini-mcp-provider"
export type { ProviderConfig } from "./config"

