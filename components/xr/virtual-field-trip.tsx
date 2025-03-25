"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, useTexture, Sphere, Html } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { ChevronLeft, ChevronRight, Info, MapPin, Maximize, Minimize, RotateCcw } from "lucide-react"

interface Hotspot {
  id: string
  position: [number, number, number]
  title: string
  description: string
}

interface VirtualFieldTripProps {
  title: string
  description?: string
  panoramaUrl: string
  hotspots?: Hotspot[]
  onHotspotClick?: (hotspot: Hotspot) => void
  onComplete?: () => void
}

const PanoramaSphere = ({ url, hotspots = [], onHotspotClick }) => {
  const texture = useTexture(url)

  return (
    <>
      <Sphere args={[500, 60, 40]} scale={[-1, 1, 1]}>
        <meshBasicMaterial map={texture} side={2} />
      </Sphere>

      {hotspots.map((hotspot) => (
        <group key={hotspot.id} position={hotspot.position}>
          <mesh onClick={() => onHotspotClick(hotspot)} scale={[5, 5, 5]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="red" transparent opacity={0.8} />
          </mesh>
          <Html position={[0, 7, 0]} center>
            <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs whitespace-nowrap">
              {hotspot.title}
            </div>
          </Html>
        </group>
      ))}
    </>
  )
}

export function VirtualFieldTrip({
  title,
  description,
  panoramaUrl,
  hotspots = [],
  onHotspotClick,
  onComplete,
}: VirtualFieldTripProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null)
  const [visitedHotspots, setVisitedHotspots] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Track visited hotspots
  useEffect(() => {
    if (activeHotspot && !visitedHotspots.has(activeHotspot.id)) {
      const newVisited = new Set(visitedHotspots)
      newVisited.add(activeHotspot.id)
      setVisitedHotspots(newVisited)

      // Check if all hotspots have been visited
      if (newVisited.size === hotspots.length && onComplete) {
        onComplete()
      }
    }
  }, [activeHotspot, visitedHotspots, hotspots, onComplete])

  const handleHotspotClick = (hotspot: Hotspot) => {
    setActiveHotspot(hotspot)
    if (onHotspotClick) {
      onHotspotClick(hotspot)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="w-full flex flex-col" ref={containerRef}>
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>

        <div className="flex gap-2">
          <Badge variant="outline">
            {visitedHotspots.size}/{hotspots.length} locations explored
          </Badge>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card className="w-full">
        <CardContent className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading panorama...</span>
            </div>
          )}

          <div className={`${isFullscreen ? "h-screen" : "h-[500px]"} w-full`}>
            <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
              <PanoramaSphere url={panoramaUrl} hotspots={hotspots} onHotspotClick={handleHotspotClick} />
              <OrbitControls enableZoom={true} enablePan={false} enableDamping dampingFactor={0.05} rotateSpeed={0.5} />
            </Canvas>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-center">
            <div className="bg-background/80 backdrop-blur-sm p-2 rounded-lg flex gap-2">
              <Button variant="ghost" size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MapPin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeHotspot && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold">{activeHotspot.title}</h3>
            <p className="mt-2">{activeHotspot.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

