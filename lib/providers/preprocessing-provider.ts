/**
 * Preprocessing Provider Interface
 * Uses OpenCV for image segmentation, frame manipulation, and preprocessing
 */

export interface PreprocessingProvider {
  preprocess(imageData: ImageData): Promise<ImageData>
  normalize(imageData: ImageData): Promise<ImageData>
  resize(imageData: ImageData, width: number, height: number): Promise<ImageData>
  segment(imageData: ImageData): Promise<ImageData[]>
  isConfigured(): boolean
}

// Fallback local preprocessing (basic canvas operations)
export class LocalPreprocessingProvider implements PreprocessingProvider {
  isConfigured(): boolean {
    return true // Always available
  }

  async preprocess(imageData: ImageData): Promise<ImageData> {
    // Basic preprocessing fallback
    return imageData
  }

  async normalize(imageData: ImageData): Promise<ImageData> {
    // Basic normalization fallback
    const data = new Uint8ClampedArray(imageData.data)
    return new ImageData(data, imageData.width, imageData.height)
  }

  async resize(imageData: ImageData, width: number, height: number): Promise<ImageData> {
    // Basic resize using canvas
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")

    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) throw new Error("Canvas context not available")

    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0, width, height)
    return ctx.getImageData(0, 0, width, height)
  }

  async segment(imageData: ImageData): Promise<ImageData[]> {
    // Basic segmentation fallback - return single segment
    return [imageData]
  }
}

// OpenCV-based preprocessing (when configured)
export class OpenCVPreprocessingProvider implements PreprocessingProvider {
  private cv: any = null

  constructor() {
    // OpenCV.js will be loaded dynamically
    if (typeof window !== "undefined") {
      // Check if OpenCV is available
      this.cv = (window as any).cv
    }
  }

  isConfigured(): boolean {
    return this.cv !== null && this.cv !== undefined
  }

  async preprocess(imageData: ImageData): Promise<ImageData> {
    if (!this.isConfigured()) {
      throw new Error("OpenCV not configured")
    }

    // Convert ImageData to OpenCV Mat
    const src = this.cv.matFromImageData(imageData)
    
    // Apply preprocessing: convert to grayscale, blur, normalize
    const gray = new this.cv.Mat()
    this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY)
    
    const blurred = new this.cv.Mat()
    this.cv.GaussianBlur(gray, blurred, new this.cv.Size(5, 5), 0)
    
    // Convert back to ImageData
    const result = new ImageData(
      new Uint8ClampedArray(blurred.data),
      blurred.cols,
      blurred.rows
    )

    // Clean up
    src.delete()
    gray.delete()
    blurred.delete()

    return result
  }

  async normalize(imageData: ImageData): Promise<ImageData> {
    if (!this.isConfigured()) {
      throw new Error("OpenCV not configured")
    }

    const src = this.cv.matFromImageData(imageData)
    const normalized = new this.cv.Mat()
    
    // Normalize image
    this.cv.normalize(src, normalized, 0, 255, this.cv.NORM_MINMAX)

    const result = new ImageData(
      new Uint8ClampedArray(normalized.data),
      normalized.cols,
      normalized.rows
    )

    src.delete()
    normalized.delete()

    return result
  }

  async resize(imageData: ImageData, width: number, height: number): Promise<ImageData> {
    if (!this.isConfigured()) {
      throw new Error("OpenCV not configured")
    }

    const src = this.cv.matFromImageData(imageData)
    const resized = new this.cv.Mat()
    
    const dsize = new this.cv.Size(width, height)
    this.cv.resize(src, resized, dsize, 0, 0, this.cv.INTER_LINEAR)

    const result = new ImageData(
      new Uint8ClampedArray(resized.data),
      resized.cols,
      resized.rows
    )

    src.delete()
    resized.delete()
    dsize.delete()

    return result
  }

  async segment(imageData: ImageData): Promise<ImageData[]> {
    if (!this.isConfigured()) {
      throw new Error("OpenCV not configured")
    }

    // Basic segmentation using contour detection
    const src = this.cv.matFromImageData(imageData)
    const gray = new this.cv.Mat()
    this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY)
    
    const binary = new this.cv.Mat()
    this.cv.threshold(gray, binary, 127, 255, this.cv.THRESH_BINARY)

    const contours = new this.cv.MatVector()
    const hierarchy = new this.cv.Mat()
    this.cv.findContours(binary, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE)

    const segments: ImageData[] = []
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const rect = this.cv.boundingRect(contour)
      
      // Extract segment
      const roi = src.roi(rect)
      const segmentData = new ImageData(
        new Uint8ClampedArray(roi.data),
        roi.cols,
        roi.rows
      )
      segments.push(segmentData)
      
      roi.delete()
      contour.delete()
    }

    src.delete()
    gray.delete()
    binary.delete()
    contours.delete()
    hierarchy.delete()

    return segments
  }
}

