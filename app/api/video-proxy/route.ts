/**
 * Video Proxy API Route
 * Proxies video requests from Firebase Storage to avoid CORS issues
 */

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const videoUrl = searchParams.get("url")

    console.log("Video proxy request:", { url: videoUrl, hasRange: !!request.headers.get("range") })

    if (!videoUrl) {
      console.error("Missing video URL parameter")
      return NextResponse.json(
        { error: "Missing video URL parameter" },
        { status: 400 }
      )
    }

    // Validate that it's a Firebase Storage URL for security
    if (!videoUrl.includes("firebasestorage.googleapis.com")) {
      console.error("Invalid video URL (not Firebase Storage):", videoUrl)
      return NextResponse.json(
        { error: "Invalid video URL" },
        { status: 400 }
      )
    }

    // Get Range header for partial content requests (required for video seeking)
    const rangeHeader = request.headers.get("range") || request.headers.get("Range") || ""
    
    // Fetch the video from Firebase Storage
    const fetchHeaders: HeadersInit = {}
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader
    }

    const videoResponse = await fetch(videoUrl, {
      headers: fetchHeaders,
    })

    if (!videoResponse.ok && videoResponse.status !== 206) {
      const errorText = await videoResponse.text()
      console.error("Firebase Storage error:", errorText)
      return NextResponse.json(
        { error: "Failed to fetch video", details: errorText },
        { status: videoResponse.status }
      )
    }

    // Get the content type and content length
    const contentType = videoResponse.headers.get("content-type") || "video/mp4"
    const contentLength = videoResponse.headers.get("content-length")
    const contentRange = videoResponse.headers.get("content-range")
    const acceptRanges = videoResponse.headers.get("accept-ranges") || "bytes"

    // Get the video data
    const videoBuffer = await videoResponse.arrayBuffer()

    // Create response with proper headers for video streaming
    const headers = new Headers()
    headers.set("Content-Type", contentType)
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }
    if (contentRange) {
      headers.set("Content-Range", contentRange)
    }
    headers.set("Accept-Ranges", acceptRanges)
    // Allow CORS for localhost
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
    headers.set("Access-Control-Allow-Headers", "Range")
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")

    return new NextResponse(videoBuffer, {
      status: videoResponse.status, // 206 for partial content, 200 for full
      headers,
    })
  } catch (error: any) {
    console.error("Video proxy error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to proxy video" },
      { status: 500 }
    )
  }
}

export async function HEAD(request: NextRequest) {
  // Handle HEAD requests for video metadata
  return GET(request)
}

export async function OPTIONS() {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
    },
  })
}

