/**
 * Gemini Reasoning Provider
 * Ultra-fast reasoning and LLM-based control flow using Google Gemini
 */

export interface ReasoningRequest {
  context: string
  task: string
  constraints?: string[]
  previousActions?: string[]
}

export interface ReasoningResponse {
  reasoning: string
  actions: string[]
  confidence: number
  explanation: string
}

export interface ReasoningProvider {
  reason(request: ReasoningRequest): Promise<ReasoningResponse>
  executeAction(action: string, context: Record<string, any>): Promise<any>
  isConfigured(): boolean
}

// Fallback local reasoning provider
export class LocalReasoningProvider implements ReasoningProvider {
  isConfigured(): boolean {
    return true // Always available (fallback)
  }

  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    // Basic fallback reasoning
    return {
      reasoning: "Using local fallback reasoning",
      actions: ["continue_monitoring"],
      confidence: 0.5,
      explanation: "Local reasoning provides basic decision making",
    }
  }

  async executeAction(action: string, context: Record<string, any>): Promise<any> {
    // Basic action execution
    console.log(`Executing action: ${action}`, context)
    return { success: true, action }
  }
}

// Gemini Reasoning Provider
export class GeminiReasoningProvider implements ReasoningProvider {
  private config: {
    apiKey: string
    model?: string
    baseUrl?: string
  }

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || "gemini-2.0-flash-exp",
      baseUrl: config.baseUrl || "https://generativelanguage.googleapis.com/v1beta",
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    if (!this.isConfigured()) {
      throw new Error("Gemini reasoning not configured")
    }

    try {
      const prompt = this.buildReasoningPrompt(request)

      const response = await fetch(
        `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
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
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
              response_mime_type: "application/json",
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : text
      const content = JSON.parse(jsonStr)

      return {
        reasoning: content.reasoning || "",
        actions: content.actions || [],
        confidence: content.confidence || 0.8,
        explanation: content.explanation || "",
      }
    } catch (error) {
      console.error("Gemini reasoning error:", error)
      throw error
    }
  }

  async executeAction(action: string, context: Record<string, any>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error("Gemini reasoning not configured")
    }

    try {
      const prompt = `Execute this action in the surveillance system: ${action}
Context: ${JSON.stringify(context, null, 2)}

Provide a JSON response with:
{
  "success": boolean,
  "result": any,
  "message": string
}`

      const response = await fetch(
        `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
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
              maxOutputTokens: 512,
              response_mime_type: "application/json",
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : text
      const content = JSON.parse(jsonStr)

      return {
        success: content.success || false,
        result: content.result,
        message: content.message || "",
      }
    } catch (error) {
      console.error("Gemini action execution error:", error)
      throw error
    }
  }

  private buildReasoningPrompt(request: ReasoningRequest): string {
    let prompt = `You are a reasoning agent for a video surveillance system. Analyze the context and provide actionable reasoning with specific steps.

Context: ${request.context}

Task: ${request.task}

`

    if (request.constraints && request.constraints.length > 0) {
      prompt += `Constraints:\n${request.constraints.map((c) => `- ${c}`).join("\n")}\n\n`
    }

    if (request.previousActions && request.previousActions.length > 0) {
      prompt += `Previous Actions:\n${request.previousActions.map((a) => `- ${a}`).join("\n")}\n\n`
    }

    prompt += `Provide a JSON response with:
{
  "reasoning": "step-by-step reasoning process",
  "actions": ["action1", "action2", ...],
  "confidence": 0.0-1.0,
  "explanation": "brief explanation of the reasoning"
}`

    return prompt
  }
}

