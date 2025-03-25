"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Download, Search } from "lucide-react"
import ForceGraph2D from "react-force-graph-2d"
import { Input } from "@/components/ui/input"

interface Concept {
  id: string
  name: string
  mastery: number // 0-100
  subjectId: string
  subjectName: string
}

interface Connection {
  source: string
  target: string
  strength: number // 0-1
  type: string // prerequisite, related, etc.
}

interface ConceptMapProps {
  userId: string
  initialConcepts?: Concept[]
  initialConnections?: Connection[]
  subjects?: Array<{ id: string; name: string }>
}

export function ConceptMap({ userId, initialConcepts = [], initialConnections = [], subjects = [] }: ConceptMapProps) {
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts)
  const [connections, setConnections] = useState<Connection[]>(initialConnections)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [masteryThreshold, setMasteryThreshold] = useState([0])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("graph")
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const [selectedNode, setSelectedNode] = useState<any>(null)

  const graphRef = useRef<any>()

  // Fetch knowledge graph data when parameters change
  useEffect(() => {
    fetchKnowledgeGraph()
  }, [selectedSubject, masteryThreshold])

  // Update graph data when concepts or connections change
  useEffect(() => {
    const filteredConcepts = concepts.filter(
      (concept) =>
        concept.mastery >= masteryThreshold[0] &&
        (!selectedSubject || concept.subjectId === selectedSubject) &&
        (!searchQuery || concept.name.toLowerCase().includes(searchQuery.toLowerCase())),
    )

    const conceptIds = new Set(filteredConcepts.map((c) => c.id))

    const filteredConnections = connections.filter((conn) => conceptIds.has(conn.source) && conceptIds.has(conn.target))

    const nodes = filteredConcepts.map((concept) => ({
      id: concept.id,
      name: concept.name,
      mastery: concept.mastery,
      subjectId: concept.subjectId,
      subjectName: concept.subjectName,
      val: 1 + concept.mastery / 20, // Size based on mastery
      color: getMasteryColor(concept.mastery),
    }))

    const links = filteredConnections.map((conn) => ({
      source: conn.source,
      target: conn.target,
      strength: conn.strength,
      type: conn.type,
      value: conn.strength,
      color: getConnectionColor(conn.type),
    }))

    setGraphData({ nodes, links })
  }, [concepts, connections, selectedSubject, masteryThreshold, searchQuery])

  const fetchKnowledgeGraph = async () => {
    setIsLoading(true)

    try {
      let url = "/api/knowledge-graph"

      if (selectedSubject) {
        url += `?subjectId=${selectedSubject}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.concepts && data.connections) {
        setConcepts(data.concepts)
        setConnections(data.connections)
      }
    } catch (error) {
      console.error("Error fetching knowledge graph:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMasteryColor = (mastery: number) => {
    if (mastery < 20) return "hsl(var(--destructive))" // Red
    if (mastery < 40) return "hsl(var(--warning))" // Orange
    if (mastery < 60) return "hsl(var(--yellow))" // Yellow
    if (mastery < 80) return "hsl(var(--info))" // Blue
    return "hsl(var(--success))" // Green
  }

  const getConnectionColor = (type: string) => {
    switch (type) {
      case "prerequisite":
        return "rgba(220, 38, 38, 0.6)" // Red
      case "related":
        return "rgba(59, 130, 246, 0.6)" // Blue
      case "builds-on":
        return "rgba(16, 185, 129, 0.6)" // Green
      default:
        return "rgba(156, 163, 175, 0.6)" // Gray
    }
  }

  const handleNodeClick = (node: any) => {
    setSelectedNode(node)

    // Highlight connected nodes and links
    const connectedNodeIds = new Set()
    const connectedLinks = new Set()

    graphData.links.forEach((link) => {
      if (link.source.id === node.id || link.target.id === node.id) {
        connectedNodeIds.add(link.source.id === node.id ? link.target.id : link.source.id)
        connectedLinks.add(link)
      }
    })

    setHighlightNodes(connectedNodeIds)
    setHighlightLinks(connectedLinks)
  }

  const handleBackgroundClick = () => {
    setSelectedNode(null)
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
  }

  const zoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.2, 400)
    }
  }

  const zoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 0.8, 400)
    }
  }

  const resetView = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 1000)
      graphRef.current.zoom(1, 1000)
    }
  }

  const exportAsPNG = () => {
    if (!graphRef.current) return

    const canvas = document.querySelector("canvas")
    if (!canvas) return

    const link = document.createElement("a")
    link.download = "knowledge-graph.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const nodeCanvasObject = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    const textWidth = ctx.measureText(label).width
    const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.2)

    // Node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI)
    ctx.fillStyle = node.color
    ctx.fill()

    // Highlight ring for selected or connected nodes
    if (selectedNode && (node.id === selectedNode.id || highlightNodes.has(node.id))) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.val * 1.2, 0, 2 * Math.PI)
      ctx.strokeStyle = "hsl(var(--primary))"
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }

    // Node label
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + node.val + 2, bckgDimensions[0], bckgDimensions[1])

    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "black"
    ctx.fillText(label, node.x, node.y + node.val + 2 + bckgDimensions[1] / 2)
  }

  const linkCanvasObject = (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Draw the link
    const start = link.source
    const end = link.target

    if (!start || !end || typeof start !== "object" || typeof end !== "object") return

    // Check if this link is highlighted
    const isHighlighted = selectedNode && highlightLinks.has(link)

    // Set line style
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = isHighlighted ? "hsl(var(--primary))" : link.color
    ctx.lineWidth = isHighlighted ? 2 / globalScale : 1 / globalScale
    ctx.stroke()

    // Draw arrow if it's a prerequisite
    if (link.type === "prerequisite") {
      const dx = end.x - start.x
      const dy = end.y - start.y
      const angle = Math.atan2(dy, dx)

      const headLength = 10 / globalScale
      const headWidth = 6 / globalScale

      // Calculate position for the arrowhead (slightly before the target node)
      const distance = Math.sqrt(dx * dx + dy * dy)
      const targetNodeRadius = end.val || 5
      const arrowX = end.x - (targetNodeRadius * dx) / distance
      const arrowY = end.y - (targetNodeRadius * dy) / distance

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle - Math.PI / 6),
        arrowY - headLength * Math.sin(angle - Math.PI / 6),
      )
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle + Math.PI / 6),
        arrowY - headLength * Math.sin(angle + Math.PI / 6),
      )
      ctx.closePath()
      ctx.fillStyle = isHighlighted ? "hsl(var(--primary))" : link.color
      ctx.fill()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Knowledge Graph</CardTitle>
            <CardDescription>Visualize connections between concepts and your mastery level</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedSubject || ""} onValueChange={(value) => setSelectedSubject(value || null)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="graph">Graph View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[200px]"
              />
            </div>

            <div className="flex flex-col w-full sm:w-auto">
              <div className="flex justify-between mb-1">
                <span className="text-sm">Mastery Threshold</span>
                <span className="text-sm font-medium">{masteryThreshold[0]}%</span>
              </div>
              <Slider
                value={masteryThreshold}
                onValueChange={setMasteryThreshold}
                min={0}
                max={100}
                step={10}
                className="w-full sm:w-[200px]"
              />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Badge variant="outline" className="bg-destructive/20">
              Beginner
            </Badge>
            <Badge variant="outline" className="bg-warning/20">
              Developing
            </Badge>
            <Badge variant="outline" className="bg-yellow/20">
              Intermediate
            </Badge>
            <Badge variant="outline" className="bg-info/20">
              Advanced
            </Badge>
            <Badge variant="outline" className="bg-success/20">
              Mastered
            </Badge>
          </div>

          <TabsContent value="graph" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : graphData.nodes.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[500px] text-center">
                <p className="text-muted-foreground mb-2">No concepts match your current filters.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSubject(null)
                    setMasteryThreshold([0])
                    setSearchQuery("")
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="relative h-[500px] border rounded-md">
                <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                  <Button variant="outline" size="icon" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={resetView}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={exportAsPNG}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeLabel="name"
                  nodeCanvasObject={nodeCanvasObject}
                  linkCanvasObject={linkCanvasObject}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={handleBackgroundClick}
                  cooldownTicks={100}
                  linkDirectionalParticles={(link) => (selectedNode && highlightLinks.has(link) ? 4 : 0)}
                  linkDirectionalParticleWidth={2}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                  width={800}
                  height={500}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : graphData.nodes.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[500px] text-center">
                <p className="text-muted-foreground mb-2">No concepts match your current filters.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSubject(null)
                    setMasteryThreshold([0])
                    setSearchQuery("")
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="h-[500px] overflow-y-auto border rounded-md p-4">
                <div className="space-y-4">
                  {graphData.nodes
                    .sort((a, b) => b.mastery - a.mastery)
                    .map((node) => {
                      // Find connections for this node
                      const nodeConnections = graphData.links.filter(
                        (link) => link.source.id === node.id || link.target.id === node.id,
                      )

                      return (
                        <div key={node.id} className="border rounded-md p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: node.color }}></div>
                              <h3 className="font-medium">{node.name}</h3>
                            </div>
                            <Badge>{node.mastery}% Mastery</Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">Subject: {node.subjectName}</p>

                          {nodeConnections.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium mb-1">Connections:</h4>
                              <ul className="text-sm space-y-1">
                                {nodeConnections.map((link, i) => {
                                  const isSource = link.source.id === node.id
                                  const connectedNode = isSource ? link.target : link.source
                                  const connectionType = link.type

                                  return (
                                    <li key={i} className="flex items-center">
                                      <div
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{ backgroundColor: link.color }}
                                      ></div>
                                      <span>
                                        {isSource ? "Connects to" : "Connected from"}{" "}
                                        <strong>{connectedNode.name}</strong>
                                        {connectionType && ` (${connectionType})`}
                                      </span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {graphData.nodes.length} concepts, {graphData.links.length} connections
        </div>

        <Button variant="outline" onClick={fetchKnowledgeGraph}>
          Refresh Graph
        </Button>
      </CardFooter>
    </Card>
  )
}

