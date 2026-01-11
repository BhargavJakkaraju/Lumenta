"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { executeActionNode } from "@/lib/mcp/client"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface AnalyzeNodeConfig {
  prompt: string
  sensitivity: "low" | "medium" | "high"
}

interface ActionNodeConfig {
  option: "call" | "email" | "text"
  description: string
}

interface NodeConfigModalProps {
  isOpen: boolean
  nodeType: "analyze" | "action" | null
  nodeId: string | null
  config: AnalyzeNodeConfig | ActionNodeConfig | null
  onSave: (nodeId: string, config: AnalyzeNodeConfig | ActionNodeConfig) => void
  onClose: () => void
}

export function NodeConfigModal({
  isOpen,
  nodeType,
  nodeId,
  config,
  onSave,
  onClose,
}: NodeConfigModalProps) {
  // Local state for editing
  const [analyzeConfig, setAnalyzeConfig] = useState<AnalyzeNodeConfig>({
    prompt: "",
    sensitivity: "medium",
  })
  const [actionConfig, setActionConfig] = useState<ActionNodeConfig>({
    option: "call",
    description: "",
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    error?: string
  } | null>(null)

  // Initialize local state when modal opens or config changes
  useEffect(() => {
    if (isOpen) {
      if (nodeType === "analyze") {
        setAnalyzeConfig(
          (config as AnalyzeNodeConfig) || { prompt: "", sensitivity: "medium" }
        )
      } else if (nodeType === "action") {
        setActionConfig(
          (config as ActionNodeConfig) || { option: "call", description: "" }
        )
      }
    }
  }, [isOpen, config, nodeType])

  const handleSave = () => {
    if (!nodeId) return

    if (nodeType === "analyze") {
      onSave(nodeId, analyzeConfig)
    } else if (nodeType === "action") {
      onSave(nodeId, actionConfig)
    }

    onClose()
  }

  const handleExit = () => {
    // Reset to original config
    if (config) {
      if (nodeType === "analyze") {
        setAnalyzeConfig(config as AnalyzeNodeConfig)
      } else if (nodeType === "action") {
        setActionConfig(config as ActionNodeConfig)
      }
    }
    setTestResult(null)
    onClose()
  }

  const handleTestAction = async () => {
    if (!actionConfig.description.trim()) {
      setTestResult({
        success: false,
        message: "Please enter a description before testing",
        error: "Description is required",
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await executeActionNode(actionConfig)
      setTestResult({
        success: result.success,
        message: result.message,
        error: result.error,
      })
    } catch (error: any) {
      setTestResult({
        success: false,
        message: "Failed to test action",
        error: error.message || "Unknown error",
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleExit()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {nodeType === "analyze"
              ? "Configure Analyze Node"
              : nodeType === "action"
                ? "Configure Action Node"
                : "Configure Node"}
          </DialogTitle>
        </DialogHeader>

        {nodeType === "analyze" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="analyze-prompt" className="text-zinc-300">
                What should the camera look out for?
              </Label>
              <Textarea
                id="analyze-prompt"
                value={analyzeConfig.prompt}
                onChange={(e) =>
                  setAnalyzeConfig({ ...analyzeConfig, prompt: e.target.value })
                }
                placeholder="Enter what the camera should detect..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="analyze-sensitivity" className="text-zinc-300">
                Sensitivity
              </Label>
              <Select
                value={analyzeConfig.sensitivity}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setAnalyzeConfig({ ...analyzeConfig, sensitivity: value })
                }
              >
                <SelectTrigger
                  id="analyze-sensitivity"
                  className="bg-zinc-800 border-zinc-700 text-white w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="low" className="text-white hover:bg-zinc-700">
                    Low
                  </SelectItem>
                  <SelectItem value="medium" className="text-white hover:bg-zinc-700">
                    Medium
                  </SelectItem>
                  <SelectItem value="high" className="text-white hover:bg-zinc-700">
                    High
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {nodeType === "action" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-option" className="text-zinc-300">
                Action Option
              </Label>
              <Select
                value={actionConfig.option}
                onValueChange={(
                  value: "call" | "email" | "text"
                ) => setActionConfig({ ...actionConfig, option: value })}
              >
                <SelectTrigger
                  id="action-option"
                  className="bg-zinc-800 border-zinc-700 text-white w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="call" className="text-white hover:bg-zinc-700">
                    Call
                  </SelectItem>
                  <SelectItem value="email" className="text-white hover:bg-zinc-700">
                    Email
                  </SelectItem>
                  <SelectItem value="text" className="text-white hover:bg-zinc-700">
                    Text
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-description" className="text-zinc-300">
                Describe what you want the service to do
              </Label>
              <Textarea
                id="action-description"
                value={actionConfig.description}
                onChange={(e) => {
                  setActionConfig({ ...actionConfig, description: e.target.value })
                  setTestResult(null) // Clear test result when description changes
                }}
                placeholder="Enter description... (e.g., 'Call +1-555-123-4567 and tell them the store is getting robbed')"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
              />
            </div>

            {/* Test Button */}
            <div className="space-y-2">
              <Button
                onClick={handleTestAction}
                disabled={isTesting || !actionConfig.description.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    Test Action
                  </>
                )}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <Alert
                className={
                  testResult.success
                    ? "bg-green-900/20 border-green-700"
                    : "bg-red-900/20 border-red-700"
                }
              >
                {testResult.success ? (
                  <CheckCircle2 className="size-4 text-green-400" />
                ) : (
                  <XCircle className="size-4 text-red-400" />
                )}
                <AlertTitle className="text-white">
                  {testResult.success ? "Test Successful" : "Test Failed"}
                </AlertTitle>
                <AlertDescription className="text-zinc-300">
                  {testResult.message}
                  {testResult.error && (
                    <div className="text-red-400 mt-1 text-xs">{testResult.error}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleExit}
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            Exit
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

