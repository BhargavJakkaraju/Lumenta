/**
 * Gemini 2.5 Node Graph Provider
 * Generates full node graph configuration files from natural language
 */

export interface NodeGraphConfig {
  nodes: NodeConfig[]
  edges: EdgeConfig[]
  rules: RuleConfig[]
}

export interface NodeConfig {
  id: string
  type: "input" | "detection" | "action" | "condition" | "output"
  label: string
  position: { x: number; y: number }
  config: Record<string, any>
}

export interface EdgeConfig {
  id: string
  source: string
  target: string
  condition?: string
}

export interface RuleConfig {
  id: string
  name: string
  trigger: string
  conditions: string[]
  actions: string[]
}

export interface NodeGraphProvider {
  generateFromPrompt(prompt: string): Promise<NodeGraphConfig>
  updateGraph(graphId: string, updates: Partial<NodeGraphConfig>): Promise<NodeGraphConfig>
  validateGraph(config: NodeGraphConfig): Promise<boolean>
  isConfigured(): boolean
}

// Fallback local node graph provider
export class LocalNodeGraphProvider implements NodeGraphProvider {
  isConfigured(): boolean {
    return true // Always available (fallback)
  }

  async generateFromPrompt(prompt: string): Promise<NodeGraphConfig> {
    // Basic fallback - creates simple graph structure
    return {
      nodes: [
        {
          id: "input-1",
          type: "input",
          label: "Video Input",
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: "detection-1",
          type: "detection",
          label: "Motion Detection",
          position: { x: 200, y: 0 },
          config: { threshold: 30 },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          target: "detection-1",
        },
      ],
      rules: [],
    }
  }

  async updateGraph(graphId: string, updates: Partial<NodeGraphConfig>): Promise<NodeGraphConfig> {
    const existing = await this.generateFromPrompt("")
    return {
      ...existing,
      ...updates,
      nodes: updates.nodes || existing.nodes,
      edges: updates.edges || existing.edges,
      rules: updates.rules || existing.rules,
    }
  }

  async validateGraph(config: NodeGraphConfig): Promise<boolean> {
    // Basic validation
    if (!config.nodes || config.nodes.length === 0) return false
    if (!config.edges || config.edges.length === 0) return false
    
    // Check all edges reference valid nodes
    const nodeIds = new Set(config.nodes.map((n) => n.id))
    for (const edge of config.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return false
      }
    }
    
    return true
  }
}

// Gemini 2.5 Node Graph Provider
export class GeminiNodeGraphProvider implements NodeGraphProvider {
  private config: { apiKey: string; baseUrl?: string; model?: string }

  constructor(config: { apiKey: string; baseUrl?: string; model?: string }) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || "https://generativelanguage.googleapis.com/v1beta",
      model: config.model || "gemini-2.0-flash-exp",
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  async generateFromPrompt(prompt: string): Promise<NodeGraphConfig> {
    if (!this.isConfigured()) {
      throw new Error("Gemini 2.5 not configured")
    }

    try {
      const systemPrompt = `You are a workflow graph generator. Generate a JSON configuration for a node-based workflow graph from natural language descriptions.

The graph should have:
- nodes: array of node configurations with id, type, label, position, and config
- edges: array of edge configurations with id, source, target, and optional condition
- rules: array of rule configurations with id, name, trigger, conditions, and actions

Node types: input, detection, action, condition, output

Return ONLY valid JSON matching this structure:
{
  "nodes": [...],
  "edges": [...],
  "rules": [...]
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
                    text: `${systemPrompt}\n\nUser prompt: ${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : text
      const graphConfig = JSON.parse(jsonStr) as NodeGraphConfig

      return graphConfig
    } catch (error) {
      console.error("Gemini node graph generation error:", error)
      throw error
    }
  }

  async updateGraph(graphId: string, updates: Partial<NodeGraphConfig>): Promise<NodeGraphConfig> {
    // For now, regenerate from description of updates
    const updatePrompt = `Update the workflow graph with these changes: ${JSON.stringify(updates)}`
    return this.generateFromPrompt(updatePrompt)
  }

  async validateGraph(config: NodeGraphConfig): Promise<boolean> {
    // Use Gemini to validate graph structure
    if (!this.isConfigured()) {
      return false
    }

    try {
      const validationPrompt = `Validate this workflow graph configuration and return true if valid, false otherwise:
${JSON.stringify(config, null, 2)}`

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
                    text: validationPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 10,
            },
          }),
        }
      )

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "false"
      return text.toLowerCase().includes("true")
    } catch (error) {
      console.error("Gemini graph validation error:", error)
      return false
    }
  }
}

