export interface Edge {
  id: string
  fromNodeId: string
  toNodeId: string
}

export function createEdgeId(fromNodeId: string, toNodeId: string): string {
  return `edge-${fromNodeId}-${toNodeId}`
}

export function createEdge(fromNodeId: string, toNodeId: string): Edge {
  return {
    id: createEdgeId(fromNodeId, toNodeId),
    fromNodeId,
    toNodeId,
  }
}

export function isDuplicateEdge(edges: Edge[], fromNodeId: string, toNodeId: string): boolean {
  return edges.some(
    (edge) => edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId
  )
}

export function isValidConnection(
  fromNodeType: string,
  toNodeType: string
): boolean {
  // Video Input → Analyze or Action
  if (fromNodeType === "video_input") {
    return toNodeType === "analyze" || toNodeType === "action"
  }
  // Analyze → Action
  if (fromNodeType === "analyze") {
    return toNodeType === "action"
  }
  return false
}

export function removeEdgesForNode(edges: Edge[], nodeId: string): Edge[] {
  return edges.filter(
    (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
  )
}

