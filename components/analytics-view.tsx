"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Activity, Clock } from "lucide-react"

export function AnalyticsView() {
  // Mock analytics data
  const stats = [
    {
      label: "Total Detections",
      value: "1,234",
      change: "+12%",
      icon: Activity,
      trend: "up" as const,
    },
    {
      label: "Active Feeds",
      value: "8",
      change: "+2",
      icon: BarChart3,
      trend: "up" as const,
    },
    {
      label: "Avg Response Time",
      value: "1.2s",
      change: "-0.3s",
      icon: Clock,
      trend: "down" as const,
    },
    {
      label: "Detection Rate",
      value: "94.5%",
      change: "+2.1%",
      icon: TrendingUp,
      trend: "up" as const,
    },
  ]

  return (
    <div className="p-6 space-y-6 w-full max-w-none">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-400 mt-1">Monitor your detection system performance</p>
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
                <p
                  className={`text-xs mt-1 ${
                    stat.trend === "up" ? "text-green-400" : "text-blue-400"
                  }`}
                >
                  {stat.change} from last week
                </p>
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
          <CardContent>
            <div className="h-64 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <BarChart3 className="size-12 mx-auto mb-2 opacity-50" />
                <p>Chart visualization coming soon</p>
              </div>
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
              {[
                { type: "Person", count: 456, percentage: 37 },
                { type: "Vehicle", count: 321, percentage: 26 },
                { type: "Motion", count: 287, percentage: 23 },
                { type: "Other", count: 170, percentage: 14 },
              ].map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300">{item.type}</span>
                    <span className="text-zinc-400">{item.count}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

