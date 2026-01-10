# Lumenta Provider Architecture

This directory contains all the provider implementations for the Lumenta video surveillance platform. The architecture uses a plugin-based system where each provider has a local fallback, ensuring the system always works even without external services.

## Provider Overview

### 1. **Detection Provider** (`detection-provider.ts`, `yolov8-detection-provider.ts`)
- **Local**: Basic motion detection using frame difference
- **YOLOv8 ONNX**: Fast on-device object detection with bounding boxes
- **Tech**: ONNX Runtime Web
- **Usage**: Detects objects (person, car, etc.) in video frames

### 2. **Preprocessing Provider** (`preprocessing-provider.ts`)
- **Local**: Basic canvas operations for resize/normalize
- **OpenCV**: Image segmentation, frame manipulation, advanced preprocessing
- **Tech**: OpenCV.js (loaded via script tag)
- **Usage**: Preprocess frames before detection

### 3. **Face Recognition Provider** (`arcface-provider.ts`)
- **Local**: Placeholder with cosine similarity fallback
- **ArcFace ONNX**: Identity recognition via facial embeddings
- **Tech**: ONNX Runtime Web
- **Usage**: Recognize and identify people in video

### 4. **Video Understanding Provider** (`video-understanding-provider.ts`, `twelve-labs-provider.ts`)
- **Local**: Keyword-based search in incident descriptions
- **Twelve Labs**: High-level video analysis, semantic search, summaries
- **Tech**: Twelve Labs API
- **Usage**: Search video moments, get contextual understanding

### 5. **Speech-to-Text Provider** (`speech-to-text-provider.ts`)
- **Local**: Placeholder (could use Web Speech API)
- **ElevenLabs STT**: Convert audio streams to transcripts
- **Tech**: ElevenLabs API
- **Usage**: Transcribe audio from video feeds

### 6. **Node Graph Provider** (`gemini-nodegraph-provider.ts`)
- **Local**: Basic graph structure generation
- **Gemini 2.5**: Generate workflow graphs from natural language
- **Tech**: Google Gemini API
- **Usage**: Create detection workflows from text prompts

### 7. **Reasoning Provider** (`gemini-reasoning-provider.ts`)
- **Local**: Basic rule-based reasoning
- **Gemini**: Fast LLM-based reasoning and control flow
- **Tech**: Google Gemini API
- **Usage**: Decision making and action planning

### 8. **Orchestration Provider** (`gemini-mcp-provider.ts`)
- **Local**: Sequential task execution
- **Gemini MCP**: Orchestrate multiple AI agents (perception, planning, action)
- **Tech**: Google Gemini API with MCP protocol
- **Usage**: Coordinate multiple AI agents for complex workflows

## Configuration

Providers are configured via `config.ts` which supports:
- Environment variables (for build-time config)
- LocalStorage (for runtime config)
- Default fallbacks (ensures system always works)

### Example Configuration

```typescript
import { loadProviderConfig, saveProviderConfig } from "./config"

const config = loadProviderConfig()

// Enable YOLOv8
config.yolov8 = {
  enabled: true,
  modelPath: "/models/yolov8n.onnx",
  inputSize: 640,
  confidenceThreshold: 0.5,
}

// Enable Twelve Labs
config.twelveLabs = {
  enabled: true,
  apiKey: "your-api-key",
}

saveProviderConfig(config)
```

## Usage

```typescript
import { providerCoordinator } from "./providers"

// Get a provider (always returns configured provider or fallback)
const detectionProvider = providerCoordinator.getDetectionProvider()
const results = await detectionProvider.detect(imageData)

// Check provider status
const status = providerCoordinator.getStatus()
console.log(status.detection) // "yolov8" or "local" or "unconfigured"
```

## Provider Flow

```
Video Frame
    ↓
[Preprocessing Provider] → Normalize, resize, segment
    ↓
[Detection Provider] → Detect objects (YOLOv8 or local)
    ↓
[Face Recognition Provider] → Identify people (ArcFace or local)
    ↓
[Video Understanding Provider] → Contextual analysis (Twelve Labs or local)
    ↓
[Node Graph Provider] → Check rules (Gemini or local)
    ↓
[Reasoning Provider] → Make decisions (Gemini or local)
    ↓
[Orchestration Provider] → Coordinate agents (Gemini MCP or local)
    ↓
Events/Incidents Generated
```

## Adding New Providers

1. Create provider interface
2. Implement local fallback
3. Implement advanced provider
4. Add to `ProviderCoordinator`
5. Add configuration to `config.ts`
6. Export types in `types.ts`

## Dependencies

- `onnxruntime-web`: For running ONNX models (YOLOv8, ArcFace)
- OpenCV.js: Loaded dynamically via script tag
- API clients: All cloud APIs use fetch (no additional deps needed)

