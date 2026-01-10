"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plug, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react"

interface MCPConnection {
  id: string
  name: string
  url: string
  status: "connected" | "disconnected" | "error"
  lastConnected?: Date
}

export function MCPsView() {
  const [connections, setConnections] = useState<MCPConnection[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newConnection, setNewConnection] = useState({ name: "", url: "" })

  const handleAddConnection = () => {
    if (!newConnection.name || !newConnection.url) return

    const connection: MCPConnection = {
      id: crypto.randomUUID(),
      name: newConnection.name,
      url: newConnection.url,
      status: "disconnected",
    }

    setConnections([...connections, connection])
    setNewConnection({ name: "", url: "" })
    setShowAddForm(false)
  }

  const handleConnect = (id: string) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === id
          ? { ...conn, status: "connected" as const, lastConnected: new Date() }
          : conn
      )
    )
  }

  const handleDisconnect = (id: string) => {
    setConnections((prev) =>
      prev.map((conn) => (conn.id === id ? { ...conn, status: "disconnected" as const } : conn))
    )
  }

  const handleRemove = (id: string) => {
    setConnections((prev) => prev.filter((conn) => conn.id !== id))
  }

  const getStatusBadge = (status: MCPConnection["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="size-3 mr-1" />
            Connected
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="secondary">
            <XCircle className="size-3 mr-1" />
            Disconnected
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-600 hover:bg-red-700">
            <XCircle className="size-3 mr-1" />
            Error
          </Badge>
        )
    }
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MCP Connections</h1>
          <p className="text-zinc-400 mt-1">Manage Model Context Protocol connections</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
          <Plus className="size-4" />
          Add Connection
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>New MCP Connection</CardTitle>
            <CardDescription>Enter the connection details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Connection Name</label>
              <Input
                value={newConnection.name}
                onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                placeholder="e.g., Detection Server"
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Connection URL</label>
              <Input
                value={newConnection.url}
                onChange={(e) => setNewConnection({ ...newConnection, url: e.target.value })}
                placeholder="e.g., ws://localhost:8080"
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddConnection}>Add Connection</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {connections.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="size-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">No MCP connections configured</p>
            <p className="text-zinc-500 text-sm mt-1">Add a connection to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{connection.name}</h3>
                      {getStatusBadge(connection.status)}
                    </div>
                    <p className="text-zinc-400 text-sm">{connection.url}</p>
                    {connection.lastConnected && (
                      <p className="text-zinc-500 text-xs">
                        Last connected: {connection.lastConnected.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {connection.status === "connected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(connection.id)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleConnect(connection.id)}>
                        Connect
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(connection.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

