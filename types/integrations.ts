/**
 * Integration Types
 * User-friendly configuration for MCP tools and integrations
 */

export type IntegrationStatus = "active" | "standby" | "error"

export interface Integration {
  id: string
  name: string
  icon: string // Icon name/type for rendering
  description: string
  status: IntegrationStatus
  config: Record<string, any>
  toolName?: string // Associated MCP tool name
}

export interface IntegrationTemplate {
  id: string
  name: string
  icon: string
  description: string
  defaultConfig: Record<string, any>
  toolName: string
  configFields: Array<{
    key: string
    label: string
    type: "text" | "email" | "password" | "url" | "textarea" | "number" | "select"
    placeholder?: string
    required?: boolean
    helpText?: string
    options?: Array<{ value: string; label: string } | string> // For select type - can be array of objects or strings
  }>
}
