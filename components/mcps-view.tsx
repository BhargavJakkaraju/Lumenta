"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  CheckCircle2,
  Clock,
  Settings,
  XCircle,
  AlertCircle,
} from "lucide-react"
import type { Integration, IntegrationTemplate, IntegrationStatus } from "@/types/integrations"
import { INTEGRATION_TEMPLATES, getIntegrationIcon } from "@/lib/integrations/templates"
import { MCPTestPanel } from "@/components/mcp-test-panel"

const STORAGE_KEY = "lumenta-integrations"

export function MCPsView() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null)
  const [configuringIntegration, setConfiguringIntegration] = useState<Integration | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})

  // Load integrations from localStorage and sync to server
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setIntegrations(parsed)

        // Sync to server
        fetch("/api/mcp/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            integrations: parsed,
          }),
        }).catch((error) => {
          console.error("Failed to sync integrations to server:", error)
        })
      } catch (error) {
        console.error("Failed to load integrations:", error)
      }
    }
  }, [])

  // Save integrations to localStorage and sync to server
  const saveIntegrations = async (updated: Integration[]) => {
    setIntegrations(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    // Sync integrations to server so MCP tools can use them
    try {
      await fetch("/api/mcp/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          integrations: updated,
        }),
      })
    } catch (error) {
      console.error("Failed to sync integrations to server:", error)
    }
  }

  // Handle adding a new integration
  const handleAddIntegration = (template: IntegrationTemplate) => {
    const newIntegration: Integration = {
      id: `${template.id}-${crypto.randomUUID()}`,
      name: template.name,
      icon: template.icon,
      description: template.description,
      status: "standby",
      config: { ...template.defaultConfig },
      toolName: template.toolName,
    }

    // If no config fields needed (credentials from env vars), auto-activate
    if (!template.configFields || template.configFields.length === 0) {
      newIntegration.status = "active"
      saveIntegrations([...integrations, newIntegration])
      setShowAddDialog(false)
      setSelectedTemplate(null)
      return
    }

    // Save integration and open config dialog
    saveIntegrations([...integrations, newIntegration])
    setShowAddDialog(false)
    setSelectedTemplate(null)

    // Open configuration dialog
    setConfiguringIntegration(newIntegration)
    // Initialize config values with existing config or defaults
    setConfigValues(newIntegration.config || template.defaultConfig || {})
    setShowConfigDialog(true)
  }

  // Handle configuring an integration
  const handleSaveConfig = () => {
    if (!configuringIntegration) return

    const updated = integrations.map((int) =>
      int.id === configuringIntegration.id
        ? {
            ...int,
            config: {
              ...int.config,
              ...configValues,
            },
            status: (isValidConfig(configuringIntegration, configValues)
              ? "active"
              : "standby") as IntegrationStatus,
          }
        : int
    )

    saveIntegrations(updated)
    setShowConfigDialog(false)
    setConfiguringIntegration(null)
    setConfigValues({})
  }

  // Check if configuration is valid
  const isValidConfig = (integration: Integration, values: Record<string, any>): boolean => {
    // Extract template ID from integration ID (format: "templateId-uuid")
    // Template IDs can have hyphens (e.g., "phone-calls", "email-service")
    const template = INTEGRATION_TEMPLATES.find((t) => integration.id.startsWith(t.id + "-"))
    if (!template) return false

    // If no config fields, always valid (credentials come from env vars)
    if (!template.configFields || template.configFields.length === 0) {
      return true
    }

    return template.configFields.every((field) => {
      if (field.required) {
        const value = values[field.key]
        return value && (typeof value === "string" ? value.trim() !== "" : true)
      }
      return true
    })
  }

  // Handle toggling integration status (enables/disables it)
  const handleToggleStatus = (integration: Integration, checked: boolean) => {
    if (checked) {
      // Activating - check if config is valid first
      const template = INTEGRATION_TEMPLATES.find((t) => integration.id.startsWith(t.id + "-"))
      if (!template) return

      const isValid = isValidConfig(integration, integration.config)
      if (!isValid) {
        // Open config dialog if not valid
        setConfiguringIntegration(integration)
        setConfigValues(integration.config)
        setShowConfigDialog(true)
        return
      }

      const updated = integrations.map((int) =>
        int.id === integration.id ? { ...int, status: "active" as IntegrationStatus } : int
      )
      saveIntegrations(updated)
    } else {
      // Deactivating - simply set to standby
      const updated = integrations.map((int) =>
        int.id === integration.id ? { ...int, status: "standby" as IntegrationStatus } : int
      )
      saveIntegrations(updated)
    }
  }

  // Handle removing an integration
  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to remove this integration?")) {
      saveIntegrations(integrations.filter((int) => int.id !== id))
    }
  }

  // Get integration template
  const getTemplate = (integration: Integration): IntegrationTemplate | undefined => {
    // Extract template ID from integration ID (format: "templateId-uuid")
    // Template IDs can have hyphens (e.g., "phone-calls", "email-service")
    // So we match by finding the template whose ID prefix matches the integration ID
    return INTEGRATION_TEMPLATES.find((t) => integration.id.startsWith(t.id + "-"))
  }

  // Get status badge
  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="size-3 mr-1" />
            Active
          </Badge>
        )
      case "standby":
        return (
          <Badge variant="secondary" className="text-zinc-300">
            <Clock className="size-3 mr-1" />
            Standby
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white">
            <AlertCircle className="size-3 mr-1" />
            Error
          </Badge>
        )
    }
  }

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const Icon = getIntegrationIcon(iconName)
    return <Icon className="size-6" />
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrated Tools</h1>
          <p className="text-zinc-400 mt-1">Manage your MCP-connected services and APIs</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="size-4" />
          Add New Tool
        </Button>
      </div>

      {/* MCP Test Panel */}
      <MCPTestPanel />

      {/* Integrations Grid */}
      {integrations.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="size-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">No integrations configured</p>
            <p className="text-zinc-500 text-sm mt-1">Add a tool to get started</p>
            <Button onClick={() => setShowAddDialog(true)} className="mt-4">
              <Plus className="size-4 mr-2" />
              Add Your First Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {integrations.map((integration) => {
            const template = getTemplate(integration)
            const Icon = getIntegrationIcon(integration.icon)

            return (
              <Card key={integration.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left side: Icon, Name, Description */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">{Icon && <Icon />}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                        </div>
                        <p className="text-sm text-zinc-400">{integration.description}</p>
                      </div>
                    </div>

                    {/* Right side: Toggle Switch, Status Badge, and Actions */}
                    <div className="flex items-center gap-4">
                      {/* Toggle Switch */}
                      <Switch
                        checked={integration.status === "active"}
                        onCheckedChange={(checked) => handleToggleStatus(integration, checked)}
                        disabled={integration.status === "error"}
                        title={
                          integration.status === "active"
                            ? "Integration is active and can be used by workflows and the orchestrator"
                            : "Turn on to enable this integration for use"
                        }
                      />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfiguringIntegration(integration)
                            setConfigValues(integration.config)
                            setShowConfigDialog(true)
                          }}
                          className="gap-2"
                        >
                          <Settings className="size-4" />
                          Configure
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(integration.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                          title="Remove integration"
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Tool Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Tool</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select a tool to integrate with your workflows
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-4">
            {INTEGRATION_TEMPLATES.map((template) => {
              const Icon = getIntegrationIcon(template.icon)
              const isAdded = integrations.some((int) => int.id.startsWith(template.id + "-"))

              return (
                <button
                  key={template.id}
                  onClick={() => !isAdded && handleAddIntegration(template)}
                  disabled={isAdded}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    isAdded
                      ? "bg-zinc-950 border-zinc-800 opacity-50 cursor-not-allowed"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {Icon && <Icon className="size-5 mt-0.5 text-zinc-400" />}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white mb-1">{template.name}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {template.description}
                      </p>
                      {isAdded && (
                        <p className="text-xs text-blue-400 mt-2">Already added</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Configure {configuringIntegration?.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Set up your integration settings
            </DialogDescription>
          </DialogHeader>

          {configuringIntegration && (
            <div className="space-y-4 py-4">
              {(() => {
                const template = getTemplate(configuringIntegration)
                if (!template) return null

                // If no config fields, show message that credentials come from environment
                if (!template.configFields || template.configFields.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-zinc-300 mb-2">
                        No configuration needed for this integration.
                      </p>
                      <p className="text-sm text-zinc-500">
                        API credentials are managed by the system via environment variables.
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        You'll provide your personal information (phone number, email, etc.) when using the tool.
                      </p>
                    </div>
                  )
                }

                return template.configFields.map((field) => {
                  // Special handling for select fields (provider, mode, etc.)
                  if (field.type === "select" && field.options) {
                    // Get default value - handle both old (string array) and new (object array) formats
                    const getDefaultValue = () => {
                      // Check existing config values first
                      const existing = configValues[field.key] || configuringIntegration?.config?.[field.key]
                      if (existing) return existing
                      
                      // Check template defaultConfig
                      const templateDefault = template?.defaultConfig?.[field.key]
                      if (templateDefault) return templateDefault
                      
                      // Fall back to first option value
                      const firstOpt = field.options?.[0]
                      if (typeof firstOpt === 'string') return firstOpt
                      return firstOpt?.value || (field.key === "mode" ? "webhook" : "")
                    }
                    
                    // Special handling for provider field (backward compatibility)
                    if (field.key === "provider") {
                      return (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={field.key} className="text-zinc-300">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </Label>
                          <Select
                            value={configValues[field.key] || configuringIntegration?.config?.provider || "vapi"}
                            onValueChange={(value) =>
                              setConfigValues({ ...configValues, [field.key]: value })
                            }
                          >
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="twilio">Twilio</SelectItem>
                              <SelectItem value="vapi">Vapi</SelectItem>
                            </SelectContent>
                          </Select>
                          {field.helpText && (
                            <p className="text-xs text-zinc-500">{field.helpText}</p>
                          )}
                        </div>
                      )
                    }
                    
                    // Generic select field handler for mode and other select fields
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key} className="text-zinc-300">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </Label>
                        <Select
                          value={getDefaultValue()}
                          onValueChange={(value) =>
                            setConfigValues({ ...configValues, [field.key]: value })
                          }
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                            <SelectValue placeholder={field.placeholder || "Select option"} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option, idx) => {
                              const opt = typeof option === 'string' 
                                ? { value: option, label: option } 
                                : option
                              return (
                                <SelectItem key={opt.value || idx} value={opt.value}>
                                  {opt.label || opt.value}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        {field.helpText && (
                          <p className="text-xs text-zinc-500">{field.helpText}</p>
                        )}
                      </div>
                    )
                  }

                  // Hide assistantId field if provider is not vapi
                  if (field.key === "assistantId" && configValues.provider !== "vapi" && configValues.provider !== "Vapi") {
                    return null
                  }

                  // Hide Discord webhook fields if mode is "bot"
                  if ((field.key === "webhookUrl" || field.key === "channelId") && configValues.mode === "bot") {
                    return null
                  }

                  // Hide Discord bot fields if mode is "webhook"
                  if ((field.key === "botToken" || field.key === "defaultChannelId" || field.key === "recipientUserIds") && configValues.mode === "webhook") {
                    return null
                  }
                  
                  // Skip provider field if it was already rendered (backward compatibility)
                  if (field.key === "provider" && field.type !== "select") {
                    return null
                  }

                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-zinc-300">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={field.key}
                          value={configValues[field.key] || ""}
                          onChange={(e) =>
                            setConfigValues({ ...configValues, [field.key]: e.target.value })
                          }
                          placeholder={field.placeholder}
                          className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                          rows={4}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type}
                          value={configValues[field.key] || ""}
                          onChange={(e) =>
                            setConfigValues({ ...configValues, [field.key]: e.target.value })
                          }
                          placeholder={field.placeholder}
                          className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                          required={field.required}
                        />
                      )}
                      {field.helpText && (
                        <p className="text-xs text-zinc-500">{field.helpText}</p>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} className="bg-white text-zinc-950 hover:bg-zinc-200">
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
