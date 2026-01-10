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

interface AnalyzeNodeConfig {
  prompt: string
  sensitivity: "low" | "medium" | "high"
}

interface ActionNodeConfig {
  option: "option1" | "option2" | "option3" | "option4" | "option5"
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
    option: "option1",
    description: "",
  })

  // Initialize local state when modal opens or config changes
  useEffect(() => {
    if (isOpen) {
      if (nodeType === "analyze") {
        setAnalyzeConfig(
          (config as AnalyzeNodeConfig) || { prompt: "", sensitivity: "medium" }
        )
      } else if (nodeType === "action") {
        setActionConfig(
          (config as ActionNodeConfig) || { option: "option1", description: "" }
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
    onClose()
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
                  value: "option1" | "option2" | "option3" | "option4" | "option5"
                ) => setActionConfig({ ...actionConfig, option: value })}
              >
                <SelectTrigger
                  id="action-option"
                  className="bg-zinc-800 border-zinc-700 text-white w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="option1" className="text-white hover:bg-zinc-700">
                    Option 1
                  </SelectItem>
                  <SelectItem value="option2" className="text-white hover:bg-zinc-700">
                    Option 2
                  </SelectItem>
                  <SelectItem value="option3" className="text-white hover:bg-zinc-700">
                    Option 3
                  </SelectItem>
                  <SelectItem value="option4" className="text-white hover:bg-zinc-700">
                    Option 4
                  </SelectItem>
                  <SelectItem value="option5" className="text-white hover:bg-zinc-700">
                    Option 5
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
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, description: e.target.value })
                }
                placeholder="Enter description..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
              />
            </div>
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

