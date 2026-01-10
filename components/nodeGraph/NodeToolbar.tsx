"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"

interface NodeToolbarProps {
  onAddNode: (type: "analyze" | "action") => void
}

export function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
            <Plus className="size-4" />
            Add node
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
          <DropdownMenuItem
            onClick={() => onAddNode("analyze")}
            className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
          >
            Add Analyze Node
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAddNode("action")}
            className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
          >
            Add Action Node
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

