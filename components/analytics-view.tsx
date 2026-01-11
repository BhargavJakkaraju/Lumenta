"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Activity, Clock } from "lucide-react"

export function AnalyticsView() {
  const [summary, setSummary] = useState<{
    total: number
    open: number
    resolved: number
    lastHour: number
    lastDay: number
    activeFeeds: number
    topTypes: Array<{ type: string; count: number }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const loadSummary = async () => {
      try {
        const response = await fetch("/api/analytics/summary")
        if (!response.ok) {
          throw new Error("Failed to load analytics.")
        }
        const data = await response.json()
        if (isActive) {
          setSummary(data)
          setLoadError(null)
        }
      } catch (error: any) {
        if (isActive) {
          setLoadError(error.message || "Failed to load analytics.")
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadSummary()
    const interval = window.setInterval(loadSummary, 10000)

    return () => {
      isActive = false
      window.clearInterval(interval)
    }
  }, [])

  const stats = [
    {
      label: "Total Detections",
      value: summary ? summary.total.toLocaleString() : "0",
      change: "All time",
      icon: Activity,
    },
    {
      label: "Active Feeds",
      value: summary ? summary.activeFeeds.toLocaleString() : "0",
      change: "Reporting now",
      icon: BarChart3,
    },
    {
      label: "Open Incidents",
      value: summary ? summary.open.toLocaleString() : "0",
      change: "Needs review",
      icon: Clock,
    },
    {
      label: "Last Hour",
      value: summary ? summary.lastHour.toLocaleString() : "0",
      change: "Recent activity",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="p-6 space-y-6 w-full max-w-none">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
          <span>Monitor your detection system performance</span>
          <span className="text-xs text-zinc-500">
            {isLoading ? "Loading…" : loadError ? "Offline" : "Live"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{stat.label}</CardTitle>
                <Icon className="size-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs mt-1 text-zinc-400">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Detection Trends</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Last 24 hours</span>
              <span className="text-white">{summary?.lastDay ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last hour</span>
              <span className="text-white">{summary?.lastHour ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Resolved</span>
              <span className="text-white">{summary?.resolved ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Top Detections</CardTitle>
            <CardDescription>Most frequent detection types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(summary?.topTypes ?? []).map((item) => {
                const percentage = summary && summary.total > 0
                  ? Math.round((item.count / summary.total) * 100)
                  : 0
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300 capitalize">{item.type}</span>
                      <span className="text-zinc-400">{item.count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {(summary?.topTypes ?? []).length === 0 && (
                <p className="text-zinc-500">No detections yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
