import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

const TWELVELABS_API_KEY = process.env.TWELVELABS_API_KEY
const TWELVELABS_INDEX_ID = process.env.TWELVELABS_INDEX_ID
const TWELVELABS_API_BASE = "https://api.twelvelabs.io/v1.2"

if (!TWELVELABS_API_KEY) {
  console.warn("TWELVELABS_API_KEY not set")
}

/**
 * Poll task status until it's ready
 */
async function waitForTaskComplete(taskId: string, maxAttempts = 60, sleepInterval = 5000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${TWELVELABS_API_BASE}/tasks/${taskId}`, {
      headers: {
        "x-api-key": TWELVELABS_API_KEY!,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.statusText}`)
    }

    const task = await response.json()
    
    if (task.status === "ready") {
      return task.video_id || task.asset_id
    }
    
    if (task.status === "failed" || task.status === "error") {
      throw new Error(`Task failed with status: ${task.status}`)
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, sleepInterval))
  }

  throw new Error("Task indexing timed out")
}

// Configure max body size for video uploads (250MB)
export const maxDuration = 300 // 5 minutes timeout
export const runtime = 'nodejs'

/**
 * POST /api/video-highlights
 * Process a video (local file or URL) and generate chapter highlights using TwelveLabs
 */
export async function POST(request: Request) {
  if (!TWELVELABS_API_KEY) {
    return NextResponse.json(
      { error: "TWELVELABS_API_KEY not configured" },
      { status: 500 }
    )
  }

  if (!TWELVELABS_INDEX_ID) {
    return NextResponse.json(
      { error: "TWELVELABS_INDEX_ID not configured" },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { videoUrl, feedId } = body

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      )
    }

    let videoId: string

    // Check if it's a local file path (starts with /videos/)
    if (videoUrl.startsWith("/videos/")) {
      // Local file - upload and index directly using tasks endpoint
      const filename = videoUrl.replace("/videos/", "")
      const filePath = join(process.cwd(), "public", "videos", filename)
      
      try {
        // Check file size before reading
        const stats = await stat(filePath)
        const fileSizeMB = stats.size / (1024 * 1024)
        
        // TwelveLabs direct upload limit is 200MB
        const MAX_FILE_SIZE_MB = 200
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          throw new Error(
            `Video file is too large (${fileSizeMB.toFixed(1)}MB). ` +
            `Direct upload limit is ${MAX_FILE_SIZE_MB}MB. ` +
            `Please either: 1) Use a smaller video file, or 2) Upload to a public URL (like Cloudinary) and use that URL instead.`
          )
        }
        
        console.log(`Uploading file: ${filename}, Size: ${fileSizeMB.toFixed(2)}MB`)
        
        const fileBuffer = await readFile(filePath)
        
        // Step 1: Upload as asset first (using assets endpoint)
        const assetFormData = new FormData()
        const fileBlob = new Blob([fileBuffer], { type: 'video/mp4' })
        assetFormData.append("file", fileBlob, filename)
        assetFormData.append("method", "direct")

        const assetResponse = await fetch(`${TWELVELABS_API_BASE}/assets`, {
          method: "POST",
          headers: {
            "x-api-key": TWELVELABS_API_KEY,
          },
          body: assetFormData,
        })

        if (!assetResponse.ok) {
          const errorText = await assetResponse.text()
          if (assetResponse.status === 413) {
            throw new Error(
              `Video file is too large (${fileSizeMB.toFixed(1)}MB). ` +
              `TwelveLabs direct upload limit is 200MB. ` +
              `Please either: 1) Use a smaller video file (<200MB), or 2) Upload to Cloudinary and use the public URL instead.`
            )
          }
          throw new Error(`Failed to upload asset: ${errorText}`)
        }

        const assetData = await assetResponse.json()
        const assetId = assetData.id || assetData._id

        if (!assetId) {
          throw new Error("No asset ID returned from upload")
        }

        console.log(`Asset uploaded: ${assetId}, waiting for processing...`)

        // Step 2: Wait for asset to be ready (simplified - just wait a bit)
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Step 3: Index the asset using tasks endpoint
        const indexFormData = new FormData()
        indexFormData.append("index_id", TWELVELABS_INDEX_ID)
        indexFormData.append("asset_id", assetId)

        const taskResponse = await fetch(`${TWELVELABS_API_BASE}/tasks`, {
          method: "POST",
          headers: {
            "x-api-key": TWELVELABS_API_KEY,
          },
          body: indexFormData,
        })

        if (!taskResponse.ok) {
          const errorText = await taskResponse.text()
          throw new Error(`Failed to index asset: ${errorText}`)
        }

        const taskData = await taskResponse.json()
        const taskId = taskData._id || taskData.id

        if (!taskId) {
          throw new Error("No task ID returned from indexing")
        }

        console.log(`Task created: ${taskId}, waiting for completion...`)

        // Step 4: Wait for task to complete (this returns the video_id)
        videoId = await waitForTaskComplete(taskId)
      } catch (error: any) {
        if (error.code === "ENOENT") {
          throw new Error(`Video file not found: ${filename}. Please ensure the file exists in public/videos/`)
        }
        throw error
      }
    } else {
      // Public URL - use URL upload method
      const uploadResponse = await fetch(`${TWELVELABS_API_BASE}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": TWELVELABS_API_KEY,
        },
        body: JSON.stringify({
          index_id: TWELVELABS_INDEX_ID,
          video_url: videoUrl,
        }),
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Failed to upload video: ${errorText}`)
      }

      const uploadData = await uploadResponse.json()
      const taskId = uploadData._id || uploadData.id

      if (!taskId) {
        throw new Error("No task ID returned from upload")
      }

      // Wait for indexing to complete (this returns the video_id)
      videoId = await waitForTaskComplete(taskId)
    }

    // Step 3: Generate chapters with detailed prompt for security camera analysis
    const generateResponse = await fetch(`${TWELVELABS_API_BASE}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TWELVELABS_API_KEY,
      },
      body: JSON.stringify({
        video_id: videoId,
        type: "chapter",
        prompt: "Analyze this security camera footage and generate chapter timestamps for key events. For each chapter, describe: what activity or event is happening (e.g., 'Person enters frame', 'Vehicle approaches', 'Package left unattended', 'Unauthorized access attempt'), when it occurs, and any notable details. Focus on: people, vehicles, objects, suspicious activities, access events, and any security-relevant incidents.",
      }),
    })

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text()
      throw new Error(`Failed to generate chapters: ${errorText}`)
    }

    const generateData = await generateResponse.json()
    
    // Convert TwelveLabs chapters to our format
    const chapters = generateData.chapters?.map((chapter: any) => ({
      start: chapter.start_sec || chapter.start || 0,
      title: chapter.chapter_title || chapter.title || "Chapter",
    })) || []

    return NextResponse.json({
      chapters,
      videoId,
    })
  } catch (error: any) {
    console.error("Error processing video highlights:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process video highlights" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/video-highlights
 * Get highlights for an already indexed video
 */
export async function GET(request: Request) {
  if (!TWELVELABS_API_KEY) {
    return NextResponse.json(
      { error: "TWELVELABS_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      )
    }

    // Generate chapter timestamps using TwelveLabs REST API
    const generateResponse = await fetch(`${TWELVELABS_API_BASE}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TWELVELABS_API_KEY,
      },
      body: JSON.stringify({
        video_id: videoId,
        type: "chapter",
        prompt: "Generate chapter timestamps for this security camera footage highlighting key events and activities.",
      }),
    })

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text()
      throw new Error(`TwelveLabs API error: ${errorText}`)
    }

    const data = await generateResponse.json()
    
    // Convert TwelveLabs chapters to our format
    const chapters = data.chapters?.map((chapter: any) => ({
      start: chapter.start_sec || chapter.start || 0,
      title: chapter.chapter_title || chapter.title || "Chapter",
    })) || []

    return NextResponse.json({
      chapters,
      videoId,
    })
  } catch (error: any) {
    console.error("Error fetching video highlights:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch video highlights" },
      { status: 500 }
    )
  }
}
