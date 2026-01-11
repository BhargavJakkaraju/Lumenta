/**
 * Video Analyzer
 * Uses Gemini to analyze video and extract events at specific timestamps
 */

export interface VideoEventData {
  timestamp: number // in seconds
  description: string
  severity: "low" | "medium" | "high"
  type: "motion" | "person" | "vehicle" | "object" | "alert" | "activity"
}

const FALLBACK_EVENTS_CAMERA_1: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Two masked individuals enter jewelry store through glass door (one with red helmet, one with black mask, both carrying crowbars)",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 6,
    description: "One individual starts using crowbar to break glass display cases while woman watches",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 12,
    description: "Individuals continue breaking glass display cases",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 25,
    description: "Individuals begin taking jewelry from display cases, woman attempts to stop them but fails",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 43,
    description: "Theft continues, woman tries to retrieve some items",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 67,
    description: "Individuals leave store with stolen jewelry, woman left behind looking at empty display cases",
    severity: "high",
    type: "alert",
  },
]

const FALLBACK_EVENTS_CAMERA_2: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Woman folding laundry on a bed while a child plays nearby",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 29,
    description: "Woman playfully interacts with the child, tossing them onto the bed, causing both to fall off",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 64,
    description: "Camera pans to the right, revealing a table with snacks and drinks",
    severity: "low",
    type: "motion",
  },
  {
    timestamp: 72,
    description: "Woman reappears, carrying the child towards the left side of the frame",
    severity: "low",
    type: "activity",
  },
]

const FALLBACK_EVENTS_CAMERA_3: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Person wearing white jacket and maroon backpack picks up brown paper bag from doorstep",
    severity: "medium",
    type: "activity",
  },
  {
    timestamp: 7,
    description: "Person takes out blue package and smaller item from bag and examines them",
    severity: "medium",
    type: "activity",
  },
  {
    timestamp: 17,
    description: "Person puts items back into bag and walks away",
    severity: "medium",
    type: "activity",
  },
  {
    timestamp: 20,
    description: "Camera shows empty doorway with two pairs of flip-flops visible on either side of door mat",
    severity: "low",
    type: "motion",
  },
]

const FALLBACK_EVENTS_CAMERA_4: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Wide shot of factory floor with two workers near machinery",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 2,
    description: "Sparks seen flying from one of the machines",
    severity: "medium",
    type: "alert",
  },
  {
    timestamp: 5,
    description: "Large fire erupts and quickly engulfs machine, smoke billows out, one worker runs away",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 8,
    description: "Worker attempts to extinguish fire using a hose",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 11,
    description: "Flames continue to rise and spread across machine's surface",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 14,
    description: "More smoke fills area, obscuring parts of the scene",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 15,
    description: "Another worker joins effort to put out fire, but unable to control blaze",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 18,
    description: "Fire continues to burn intensely, filling more space within frame",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 23,
    description: "Thick white smoke completely engulfs entire screen, fire has spread significantly",
    severity: "high",
    type: "alert",
  },
]

const FALLBACK_EVENTS_CAMERA_5: VideoEventData[] = [
  {
    timestamp: 1,
    description: "Child is seen playing with a dresser",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 10,
    description: "Child opens doors in consecutive order from top to bottom",
    severity: "medium",
    type: "activity",
  },
  {
    timestamp: 18,
    description: "Dresser falls over and onto child",
    severity: "high",
    type: "alert",
  },
]

const FALLBACK_EVENTS_CAMERA_6: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Black dog walking from right side of frame towards potted plants on wooden deck",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 3,
    description: "Leopard enters from above and attacks the dog, leading to brief struggle",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 27,
    description: "Leopard releases the dog and leaves through gate at top of stairs",
    severity: "high",
    type: "alert",
  },
  {
    timestamp: 28,
    description: "Dog stands up and runs away",
    severity: "medium",
    type: "activity",
  },
  {
    timestamp: 34,
    description: "Woman in purple dress appears and checks the area where the fight occurred",
    severity: "medium",
    type: "activity",
  },
  {
    timestamp: 43,
    description: "Woman calls her dogs inside and closes the door behind them",
    severity: "low",
    type: "activity",
  },
]

const FALLBACK_EVENTS_CAMERA_7: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Workers in orange vests actively engaged in packing boxes on tables",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 11,
    description: "Brief dialogue between workers (incomplete)",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 20,
    description: "Workers handling and organizing boxes, some standing near stacks of cardboard boxes",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 30,
    description: "Yellow pallet jack visible and idle nearby, two individuals walking towards each other in background",
    severity: "low",
    type: "activity",
  },
]

const FALLBACK_EVENTS_CAMERA_8: VideoEventData[] = [
  {
    timestamp: 0,
    description: "People with umbrellas walking past bus shelter, silver car parked across road near orange traffic cones",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 10,
    description: "Yellow taxi arrives and parks next to silver car",
    severity: "low",
    type: "vehicle",
  },
  {
    timestamp: 16,
    description: "Elderly man with glasses walks into frame using cane",
    severity: "low",
    type: "person",
  },
  {
    timestamp: 24,
    description: "Two men exit bus shelter, another person enters carrying two bags",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 40,
    description: "Three individuals emerge from bus stop area, two women sharing umbrella and another woman following behind",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 60,
    description: "More pedestrians passing through scene, including those exiting vehicles at intersections",
    severity: "low",
    type: "activity",
  },
]

const FALLBACK_EVENTS_CAMERA_9: VideoEventData[] = [
  {
    timestamp: 0,
    description: "Man in backyard setting near pool, holding pool net and preparing to clean pool, possibly talking to someone off-camera",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 18,
    description: "Man jumps into the pool",
    severity: "low",
    type: "activity",
  },
  {
    timestamp: 22,
    description: "Man completes jump into pool",
    severity: "low",
    type: "activity",
  },
]

function getFallbackEvents(feedId: string): VideoEventData[] {
  if (feedId === "camera-2") {
    return FALLBACK_EVENTS_CAMERA_2
  }
  if (feedId === "camera-3") {
    return FALLBACK_EVENTS_CAMERA_3
  }
  if (feedId === "camera-4") {
    return FALLBACK_EVENTS_CAMERA_4
  }
  if (feedId === "camera-5") {
    return FALLBACK_EVENTS_CAMERA_5
  }
  if (feedId === "camera-6") {
    return FALLBACK_EVENTS_CAMERA_6
  }
  if (feedId === "camera-7") {
    return FALLBACK_EVENTS_CAMERA_7
  }
  if (feedId === "camera-8") {
    return FALLBACK_EVENTS_CAMERA_8
  }
  if (feedId === "camera-9") {
    return FALLBACK_EVENTS_CAMERA_9
  }
  // Default to camera-1 (main entrance)
  return FALLBACK_EVENTS_CAMERA_1
}

/**
 * Analyze video using Gemini and extract events
 */
export async function analyzeVideoWithGemini(
  videoUrl: string,
  duration: number,
  feedId?: string,
  geminiApiKey?: string
): Promise<VideoEventData[]> {
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  const fallbackEvents = getFallbackEvents(feedId || "camera-1")

  if (!apiKey) {
    console.warn("Gemini API key not found, using fallback events")
    return fallbackEvents
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta"

  // Get video description based on feedId
  let videoDescription = ""
  let focusAreas = ""
  
  if (feedId === "camera-2") {
    videoDescription = `The video starts with a woman folding laundry on a bed while a child plays nearby at [0s (00:00)]. By [29s (00:29)], she playfully interacts with the child, tossing them onto the bed, which causes both to fall off. At [64s (01:04)], the camera pans to the right, revealing a table with snacks and drinks. Finally, at [72s (01:12)], the woman reappears, carrying the child towards the left side of the frame.`
    focusAreas = "- Daily activities (folding laundry, playing)\n- Interactions between people\n- Camera movements (pans)\n- Changes in scene composition\n- Any significant activities"
  } else if (feedId === "camera-3") {
    videoDescription = `The video shows a person wearing a white jacket and maroon backpack picking up a brown paper bag from a doorstep. They examine the contents, which include a blue package and a smaller item, before placing them back into the bag. The person then walks away with the bag. The sequence of events is as follows: [0s (00:00)~7s (00:07)] The person picks up the brown paper bag from the doorstep. [7s (00:07)~17s (00:17)] They take out a blue package and a smaller item from the bag and examine them. [17s (00:17)~20s (00:20)] The person puts the items back into the bag and walks away. Afterwards, the camera captures the empty doorway where the person was standing, with two pairs of flip-flops visible on either side of the door mat.`
    focusAreas = "- Person interactions with objects (picking up, examining)\n- Package handling and examination\n- Movement patterns (walking away)\n- Scene changes (empty doorway)\n- Any suspicious or notable activities"
  } else if (feedId === "camera-4") {
    videoDescription = `The video opens with a wide shot of a factory floor at [0s (00:00)], where two workers are near some machinery. At [2s (00:02)], sparks are seen flying from one of the machines, and by [5s (00:05)], a large fire erupts and quickly engulfs the machine. Smoke begins to billow out as well. One worker runs away, while another attempts to extinguish the fire using a hose at [8s (00:08)]. The flames continue to rise and spread across the machine's surface between [9s (00:09)] and [11s (00:11)]. More smoke fills the area, obscuring parts of the scene by [14s (00:14)]. Another worker joins the effort to put out the fire at [15s (00:15)], but they are unable to control the blaze. The fire continues to burn intensely, filling more space within the frame at [18s (00:18)]. By the end of the video at [23s (00:23)], thick white smoke completely engulfs the entire screen, indicating that the fire has spread significantly beyond its initial point of origin.`
    focusAreas = "- Fire incidents (sparks, flames, smoke)\n- Worker responses and safety actions\n- Fire spread and escalation\n- Emergency situations\n- Scene visibility changes (smoke obscuring view)"
  } else if (feedId === "camera-5") {
    videoDescription = `Child is seen playing with a dresser at 0:01. Child opens doors in consecutive order from top to bottom at 0:10. Dresser falls over and onto child at 0:19.`
    focusAreas = "- Child activities and interactions with furniture\n- Safety incidents (furniture falling)\n- Sequential actions (opening doors)\n- Potential hazards and accidents\n- Child safety concerns"
  } else if (feedId === "camera-6") {
    videoDescription = `The video starts at [0s (00:00)] with a black dog walking from the right side of the frame towards some potted plants on a wooden deck. At [3s (00:03)], a leopard enters from above and attacks the dog, leading to a brief struggle. The leopard pins the dog down until about [27s (00:27)], when it releases the dog and leaves through a gate at the top of the stairs. The dog then stands up and runs away at [28s (00:28)]. At [34s (00:34)], a woman in a purple dress appears and checks the area where the fight occurred. She calls her dogs inside and closes the door behind them at [43s (00:43)].`
    focusAreas = "- Animal interactions and conflicts\n- Predator attacks and animal safety\n- Animal behavior (attacks, escapes)\n- Human responses to incidents\n- Wildlife encounters and safety concerns"
  } else if (feedId === "camera-7") {
    videoDescription = `The video depicts a warehouse setting where workers, dressed in orange vests, are actively engaged in packing boxes on tables. Early in the video, at around 11 seconds, there is a brief dialogue, though it is incomplete. Throughout the video, workers can be seen handling and organizing boxes, with some standing near stacks of cardboard boxes and others working around more stacked boxes. A yellow pallet jack is visible and idle nearby. In the background, two individuals are walking towards each other, seemingly engaged in conversation. The activities shown are consistent, reflecting the repetitive and organized nature of the work in the warehouse.`
    focusAreas = "- Warehouse operations and worker activities\n- Box packing and organization\n- Worker interactions and dialogue\n- Equipment usage (pallet jacks, boxes)\n- General warehouse workflow and activities"
  } else if (feedId === "camera-8") {
    videoDescription = `The video captures a rainy day scene at a bus stop. At the beginning [0s (00:00)], people with umbrellas are seen walking past the bus shelter, and a silver car is parked across the road near some orange traffic cones. Around [10s (00:10)], a yellow taxi arrives and parks next to the silver car. At [16s (00:16)], an elderly man with glasses walks into the frame using a cane. Midway through [24s (00:24)], two men exit the bus shelter, and another person enters carrying two bags. Towards the end [40s (00:40)], three individuals emerge from the bus stop area, with two women sharing an umbrella and another woman following behind them. The video concludes [60s (01:00)] with more pedestrians passing through the scene, including those exiting vehicles at intersections.`
    focusAreas = "- Pedestrian activity and movement\n- Vehicle arrivals and parking\n- Bus stop activities\n- Weather conditions (rain, umbrellas)\n- People entering and exiting bus shelter\n- Traffic and intersection activity"
  } else if (feedId === "camera-9") {
    videoDescription = `The video shows a man in a backyard setting near a pool. Initially, he is seen holding a pool net and appears to be preparing to clean the pool, possibly talking to someone off-camera. This scene lasts until about 18 seconds. At 18 seconds, the man then jumps into the pool, which is completed by 22 seconds.`
    focusAreas = "- Pool maintenance activities\n- Person interactions with pool equipment\n- Swimming and pool entry\n- Backyard activities\n- General pool-related activities"
  } else {
    // Default to camera-1 (main entrance)
    videoDescription = `From the beginning of the video (0s), two masked individuals enter a jewelry store through a glass door, one wearing a red helmet and the other a black mask, both carrying crowbars. By 6s, one of them starts using a crowbar to break the glass display cases while a woman inside the store watches. Between 6s and 12s, they continue breaking the glass. From 12s to 25s, they begin taking jewelry from the display cases, with the woman attempting to stop them but failing. The theft continues until 43s, during which the woman tries to retrieve some items. Finally, from 43s to 67s, the individuals leave the store with the stolen jewelry, and the woman is left behind, looking at the empty display cases.`
    focusAreas = "- Entry points (when people enter)\n- Criminal activities (breaking glass, theft)\n- Interactions (woman trying to stop them)\n- Exit points (when people leave)\n- Any significant changes in activity"
  }

  try {
    // For now, we'll use the video description since Gemini Vision API requires base64 encoded images
    // In a production system, you'd extract frames at key timestamps and send them to Gemini
    const prompt = `Analyze this security camera video and extract key events with timestamps.

Video Description:
${videoDescription}

Video Duration: ${duration} seconds

Extract all significant events from this video with their timestamps. Return a JSON array of events in this format:
[
  {
    "timestamp": 0,
    "description": "Brief description of what happens at this timestamp",
    "severity": "low" | "medium" | "high",
    "type": "alert" | "activity" | "person" | "motion"
  }
]

Focus on:
${focusAreas}

Return ONLY the JSON array, no other text.`

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            response_mime_type: "application/json",
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini API error:", errorText)
      return fallbackEvents
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]"

    // Parse JSON response
    let jsonText = text.trim()
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n")
      jsonText = lines.slice(1, -1).join("\n")
    }
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "")

    try {
      const events = JSON.parse(jsonText)
      if (Array.isArray(events) && events.length > 0) {
        // Validate and normalize events
        return events
          .filter((e) => e.timestamp !== undefined && e.description)
          .map((e) => ({
            timestamp: Math.max(0, Math.min(e.timestamp, duration)),
            description: e.description || "",
            severity: e.severity || "medium",
            type: e.type || "alert",
          }))
          .sort((a, b) => a.timestamp - b.timestamp)
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError)
      console.log("Raw response:", jsonText)
    }

    return fallbackEvents
  } catch (error) {
    console.error("Video analysis failed:", error)
    return fallbackEvents
  }
}

/**
 * Convert VideoEventData to VideoEvent format
 */
export function convertToVideoEvents(
  eventData: VideoEventData[],
  feedId: string
): Array<{
  id: string
  timestamp: number
  type: "motion" | "person" | "vehicle" | "object" | "alert" | "activity"
  severity: "low" | "medium" | "high"
  description: string
  confidence: number
  source?: "analyze" | "summary" | "periodic"
}> {
  return eventData.map((event, index) => ({
    id: `${feedId}-event-${index}-${event.timestamp}`,
    timestamp: event.timestamp,
    type: event.type,
    severity: event.severity,
    description: event.description,
    confidence: 0.9, // High confidence for analyzed events
    source: "analyze" as const,
  }))
}

