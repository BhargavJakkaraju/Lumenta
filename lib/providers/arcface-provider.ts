/**
 * ArcFace Face Recognition Provider
 * Uses ONNX Runtime Web for identity recognition via facial embeddings
 */

export interface FaceEmbedding {
  embedding: Float32Array
  bbox: { x: number; y: number; width: number; height: number }
  confidence: number
}

export interface IdentityMatch {
  identity: string
  similarity: number
  threshold: number
}

export interface FaceRecognitionProvider {
  extractEmbedding(imageData: ImageData, faceBbox?: { x: number; y: number; width: number; height: number }): Promise<FaceEmbedding>
  compareEmbeddings(embedding1: Float32Array, embedding2: Float32Array): Promise<number>
  identifyFace(embedding: Float32Array, knownIdentities: Map<string, Float32Array>): Promise<IdentityMatch | null>
  isConfigured(): boolean
}

// Fallback local face recognition (placeholder)
export class LocalFaceRecognitionProvider implements FaceRecognitionProvider {
  isConfigured(): boolean {
    return true // Always available (fallback)
  }

  async extractEmbedding(imageData: ImageData): Promise<FaceEmbedding> {
    // Placeholder - returns dummy embedding
    const dummyEmbedding = new Float32Array(512) // ArcFace produces 512-dim embeddings
    return {
      embedding: dummyEmbedding,
      bbox: { x: 0, y: 0, width: imageData.width, height: imageData.height },
      confidence: 0.5,
    }
  }

  async compareEmbeddings(embedding1: Float32Array, embedding2: Float32Array): Promise<number> {
    // Cosine similarity fallback
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  async identifyFace(embedding: Float32Array, knownIdentities: Map<string, Float32Array>): Promise<IdentityMatch | null> {
    // Simple matching fallback
    const threshold = 0.6

    for (const [identity, knownEmbedding] of knownIdentities.entries()) {
      const similarity = await this.compareEmbeddings(embedding, knownEmbedding)
      if (similarity > threshold) {
        return {
          identity,
          similarity,
          threshold,
        }
      }
    }

    return null
  }
}

// ArcFace ONNX Provider
export class ArcFaceONNXProvider implements FaceRecognitionProvider {
  private ort: any = null
  private session: any = null
  private isInitialized = false
  private modelPath: string

  constructor(modelPath: string) {
    this.modelPath = modelPath
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load ONNX Runtime Web
      if (typeof window !== "undefined") {
        this.ort = await import("onnxruntime-web")
        
        // Load ArcFace model
        this.session = await this.ort.InferenceSession.create(this.modelPath)
        this.isInitialized = true
      }
    } catch (error) {
      console.error("Failed to initialize ArcFace:", error)
      throw new Error("ArcFace initialization failed")
    }
  }

  isConfigured(): boolean {
    return this.isInitialized && this.session !== null
  }

  async extractEmbedding(
    imageData: ImageData,
    faceBbox?: { x: number; y: number; width: number; height: number }
  ): Promise<FaceEmbedding> {
    if (!this.isConfigured()) {
      throw new Error("ArcFace not configured or initialized")
    }

    try {
      // Extract face region if bbox provided, otherwise use full image
      let faceImage = imageData
      if (faceBbox) {
        faceImage = await this.extractFaceRegion(imageData, faceBbox)
      }

      // Preprocess: resize to 112x112 (ArcFace input size) and normalize
      const preprocessed = await this.preprocess(faceImage)

      // Run inference
      const inputTensor = new this.ort.Tensor("float32", preprocessed, [1, 3, 112, 112])
      const feeds = { [this.session.inputNames[0]]: inputTensor }
      const results = await this.session.run(feeds)

      // Extract embedding and normalize
      const output = results[this.session.outputNames[0]]
      const embedding = new Float32Array(output.data)
      const normalized = this.normalizeEmbedding(embedding)

      return {
        embedding: normalized,
        bbox: faceBbox || { x: 0, y: 0, width: imageData.width, height: imageData.height },
        confidence: 1.0,
      }
    } catch (error) {
      console.error("ArcFace embedding extraction error:", error)
      throw error
    }
  }

  async compareEmbeddings(embedding1: Float32Array, embedding2: Float32Array): Promise<number> {
    // Cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  async identifyFace(
    embedding: Float32Array,
    knownIdentities: Map<string, Float32Array>
  ): Promise<IdentityMatch | null> {
    const threshold = 0.6 // Typical threshold for face recognition

    let bestMatch: IdentityMatch | null = null
    let bestSimilarity = 0

    for (const [identity, knownEmbedding] of knownIdentities.entries()) {
      const similarity = await this.compareEmbeddings(embedding, knownEmbedding)
      if (similarity > bestSimilarity && similarity > threshold) {
        bestSimilarity = similarity
        bestMatch = {
          identity,
          similarity,
          threshold,
        }
      }
    }

    return bestMatch
  }

  private async extractFaceRegion(
    imageData: ImageData,
    bbox: { x: number; y: number; width: number; height: number }
  ): Promise<ImageData> {
    const canvas = document.createElement("canvas")
    canvas.width = bbox.width
    canvas.height = bbox.height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")

    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) throw new Error("Canvas context not available")

    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(
      tempCanvas,
      bbox.x,
      bbox.y,
      bbox.width,
      bbox.height,
      0,
      0,
      bbox.width,
      bbox.height
    )

    return ctx.getImageData(0, 0, bbox.width, bbox.height)
  }

  private async preprocess(imageData: ImageData): Promise<Float32Array> {
    // Resize to 112x112 (ArcFace standard input size)
    const canvas = document.createElement("canvas")
    canvas.width = 112
    canvas.height = 112
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")

    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) throw new Error("Canvas context not available")

    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0, 112, 112)

    const resizedData = ctx.getImageData(0, 0, 112, 112)

    // Convert to float32 and normalize [0-255] -> [-1, 1]
    const data = new Float32Array(3 * 112 * 112)
    for (let i = 0; i < 112 * 112; i++) {
      const offset = i * 4
      // RGB channels (BGR order for ArcFace)
      data[i] = (resizedData.data[offset + 2] / 255.0) * 2 - 1 // B
      data[112 * 112 + i] = (resizedData.data[offset + 1] / 255.0) * 2 - 1 // G
      data[2 * 112 * 112 + i] = (resizedData.data[offset] / 255.0) * 2 - 1 // R
    }

    return data
  }

  private normalizeEmbedding(embedding: Float32Array): Float32Array {
    // L2 normalization
    let norm = 0
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i]
    }
    norm = Math.sqrt(norm)

    const normalized = new Float32Array(embedding.length)
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / norm
    }

    return normalized
  }
}

