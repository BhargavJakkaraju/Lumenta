/**
 * Integration Store
 * Server-side store for integrations synced from client
 */

import type { Integration } from "@/types/integrations"

// Server-side integration store (in production, use a database)
// This syncs with client-side localStorage
const serverIntegrations: Map<string, Integration> = new Map()

/**
 * Sync integrations from client
 */
export function syncIntegrations(integrations: Integration[]): void {
  serverIntegrations.clear()
  integrations.forEach((int) => {
    serverIntegrations.set(int.id, int)
  })
}

/**
 * Get all integrations
 */
export function getAllIntegrations(): Integration[] {
  return Array.from(serverIntegrations.values())
}

/**
 * Get active integrations by tool name
 */
export function getActiveIntegrationsForTool(toolName: string): Integration[] {
  return Array.from(serverIntegrations.values()).filter(
    (int) => int.status === "active" && int.toolName === toolName
  )
}

/**
 * Get integration by ID
 */
export function getIntegration(id: string): Integration | undefined {
  return serverIntegrations.get(id)
}
