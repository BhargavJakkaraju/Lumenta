"use client"

import { Video, Plug, BarChart3, FileText, Home } from "lucide-react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type ConsoleView = "feeds" | "mcps" | "analytics" | "logs"

interface ConsoleSidebarProps {
  currentView: ConsoleView
  onViewChange: (view: ConsoleView) => void
}

export function ConsoleSidebar({ currentView, onViewChange }: ConsoleSidebarProps) {
  const menuItems = [
    {
      id: "feeds" as ConsoleView,
      label: "Camera Feeds",
      icon: Video,
    },
    {
      id: "mcps" as ConsoleView,
      label: "MCPs",
      icon: Plug,
    },
    {
      id: "analytics" as ConsoleView,
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "logs" as ConsoleView,
      label: "Detection Logs",
      icon: FileText,
    },
  ]

  return (
    <Sidebar className="border-r border-zinc-800 bg-zinc-900/40">
      <SidebarHeader className="p-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-zinc-300 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-sm">L</span>
          </div>
          <span className="font-semibold">Lumenta</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onViewChange(item.id)
                      }}
                      className={cn(
                        "w-full justify-start gap-3 text-zinc-300 hover:text-white hover:bg-zinc-800",
                        isActive && "bg-zinc-800 text-white"
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-zinc-800">
        <Link href="/">
          <SidebarMenuButton className="w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Home className="size-4" />
            <span>Back to Home</span>
          </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}

