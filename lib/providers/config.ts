/**
 * Provider Configuration
 * Central configuration for all providers
 */

export interface ProviderConfig {
  // Detection providers
  yolov8?: {
    enabled: boolean
    modelPath: string
    inputSize: number
    confidenceThreshold: number
  }

  // Preprocessing providers
  opencv?: {
    enabled: boolean
    wasmPath?: string
  }

  // Face recognition providers
  arcface?: {
    enabled: boolean
    modelPath: string
  }

  // Video understanding providers
  twelveLabs?: {
    enabled: boolean
    apiKey: string
    baseUrl?: string
  }

  // Speech-to-text providers
  elevenLabsSTT?: {
    enabled: boolean
    apiKey: string
    baseUrl?: string
  }

  // Node graph providers
  geminiNodeGraph?: {
    enabled: boolean
    apiKey: string
    baseUrl?: string
    model?: string
  }

  // Reasoning providers (uses Gemini)
  geminiReasoning?: {
    enabled: boolean
    apiKey: string
    baseUrl?: string
    model?: string
  }

  // Orchestration providers (uses Gemini MCP)
  geminiMCP?: {
    enabled: boolean
    apiKey: string
    baseUrl?: string
    model?: string
  }
}

// Default configuration (all providers disabled, using local fallbacks)
export const defaultProviderConfig: ProviderConfig = {
  yolov8: {
    enabled: false,
    modelPath: "/models/yolov8n.onnx",
    inputSize: 640,
    confidenceThreshold: 0.5,
  },
  opencv: {
    enabled: false,
  },
  arcface: {
    enabled: false,
    modelPath: "/models/arcface.onnx",
  },
  twelveLabs: {
    enabled: false,
    apiKey: "",
  },
  elevenLabsSTT: {
    enabled: false,
    apiKey: "",
  },
  geminiNodeGraph: {
    enabled: false,
    apiKey: "",
  },
  geminiReasoning: {
    enabled: false,
    apiKey: "",
  },
  geminiMCP: {
    enabled: false,
    apiKey: "",
  },
}

// Load configuration from environment variables or localStorage
export function loadProviderConfig(): ProviderConfig {
  if (typeof window === "undefined") {
    return defaultProviderConfig
  }

  // Try to load from localStorage first
  const stored = localStorage.getItem("lumenta_provider_config")
  if (stored) {
    try {
      return { ...defaultProviderConfig, ...JSON.parse(stored) }
    } catch (error) {
      console.error("Failed to parse stored provider config:", error)
    }
  }

  // Fall back to environment variables (for build-time config)
  const config: ProviderConfig = {
    ...defaultProviderConfig,
    yolov8: {
      ...defaultProviderConfig.yolov8!,
      enabled: process.env.NEXT_PUBLIC_YOLOV8_ENABLED === "true",
      modelPath: process.env.NEXT_PUBLIC_YOLOV8_MODEL_PATH || defaultProviderConfig.yolov8!.modelPath,
    },
    opencv: {
      enabled: process.env.NEXT_PUBLIC_OPENCV_ENABLED === "true",
    },
    arcface: {
      ...defaultProviderConfig.arcface!,
      enabled: process.env.NEXT_PUBLIC_ARCFACE_ENABLED === "true",
      modelPath: process.env.NEXT_PUBLIC_ARCFACE_MODEL_PATH || defaultProviderConfig.arcface!.modelPath,
    },
    twelveLabs: {
      enabled: process.env.NEXT_PUBLIC_TWELVE_LABS_ENABLED === "true",
      apiKey: process.env.NEXT_PUBLIC_TWELVE_LABS_API_KEY || "",
    },
    elevenLabsSTT: {
      enabled: process.env.NEXT_PUBLIC_ELEVENLABS_STT_ENABLED === "true",
      apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_STT_API_KEY || "",
    },
    geminiNodeGraph: {
      enabled: process.env.NEXT_PUBLIC_GEMINI_NODEGRAPH_ENABLED === "true",
      apiKey: process.env.NEXT_PUBLIC_GEMINI_NODEGRAPH_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    },
    geminiReasoning: {
      enabled: process.env.NEXT_PUBLIC_GEMINI_REASONING_ENABLED === "true",
      apiKey: process.env.NEXT_PUBLIC_GEMINI_REASONING_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    },
    geminiMCP: {
      enabled: process.env.NEXT_PUBLIC_GEMINI_MCP_ENABLED === "true",
      apiKey: process.env.NEXT_PUBLIC_GEMINI_MCP_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
    },
  }

  return config
}

// Save configuration to localStorage
export function saveProviderConfig(config: ProviderConfig): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("lumenta_provider_config", JSON.stringify(config))
  } catch (error) {
    console.error("Failed to save provider config:", error)
  }
}

