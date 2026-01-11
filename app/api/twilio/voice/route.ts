/**
 * Twilio Voice Webhook
 * Receives call status updates and returns TwiML for calls
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Try to get message from query params (when passed via URL) or form data
    const { searchParams } = new URL(request.url)
    const messageFromQuery = searchParams.get("message")
    
    let message = messageFromQuery || "Hello, this is an automated call from Lumenta. Thank you for testing."
    
    // If not in query, try form data
    if (!messageFromQuery) {
      try {
        const formData = await request.formData()
        const messageFromForm = formData.get("message") as string
        if (messageFromForm) {
          message = messageFromForm
        }
      } catch {
        // Form data not available, use default
      }
    }

    // Generate TwiML to speak the message (escape XML)
    const escapedMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${escapedMessage}</Say>
    <Pause length="1"/>
    <Say voice="alice">This was a test call from the Lumenta MCP system. Goodbye.</Say>
</Response>`

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  } catch (error: any) {
    console.error("Error in Twilio voice webhook:", error)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Sorry, there was an error processing this call.</Say>
</Response>`,
      {
        headers: {
          "Content-Type": "text/xml",
        },
        status: 500,
      }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get message from query parameters
    const { searchParams } = new URL(request.url)
    const message = searchParams.get("message") || "Hello, this is a test call from Lumenta MCP. Thank you for testing."
    
    // Escape XML special characters
    const escapedMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${escapedMessage}</Say>
    <Pause length="1"/>
    <Say voice="alice">This was a test call from the Lumenta MCP system. Goodbye.</Say>
</Response>`

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  } catch (error: any) {
    console.error("Error in Twilio voice webhook (GET):", error)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Sorry, there was an error processing this call.</Say>
</Response>`,
      {
        headers: {
          "Content-Type": "text/xml",
        },
        status: 500,
      }
    )
  }
}
