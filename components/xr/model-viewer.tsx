"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, useGLTF, Environment, Html } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ARButton, Controllers, Hands, VRCanvas } from "@react-three/xr"
import { Loader } from "@/components/ui/loader"

interface ModelViewerProps {
  modelUrl: string
  title: string
  description?: string
  enableAR?: boolean
  enableVR?: boolean
  annotations?: Array<{
    id: string
    position: [number, number, number]
    content: string
  }>
}

const Model = ({ url, scale = 1, annotations = [], ...props }) => {
  const { scene } = useGLTF(url)
  const groupRef = useRef()

  // Auto-rotate the model
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002
    }
  })

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} scale={scale} />

      {/* Render annotations */}
      {annotations.map((annotation) => (
        <Html key={annotation.id} position={annotation.position} distanceFactor={10} occlude>
          <div className="bg-white p-2 rounded-lg shadow-lg text-sm max-w-[150px] transform -translate-x-1/2">
            {annotation.content}
          </div>
        </Html>
      ))}
    </group>
  )
}

export function ModelViewer({
  modelUrl,
  title,
  description,
  enableAR = true,
  enableVR = true,
  annotations = [],
}: ModelViewerProps) {
  const [scale, setScale] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isVRMode, setIsVRMode] = useState(false)

  // Handle loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleScaleChange = (value: number[]) => {
    setScale(value[0])
  }

  const CanvasContent = () => (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />

      <Model url={modelUrl} scale={scale} annotations={annotations} />

      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={1}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
      />
      <Environment preset="apartment" />
    </>
  )

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>

        <div className="flex gap-2">
          {enableAR && (
            <ARButton className="bg-primary text-primary-foreground hover:bg-primary/90">View in AR</ARButton>
          )}
          {enableVR && (
            <Button onClick={() => setIsVRMode(!isVRMode)} variant={isVRMode ? "default" : "outline"}>
              {isVRMode ? "Exit VR" : "Enter VR"}
            </Button>
          )}
        </div>
      </div>

      <Card className="w-full">
        <CardContent className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading 3D model...</span>
            </div>
          )}

          <div className="h-[500px] w-full">
            {isVRMode ? (
              <VRCanvas>
                <Controllers />
                <Hands />
                <CanvasContent />
              </VRCanvas>
            ) : (
              <Canvas>
                <CanvasContent />
              </Canvas>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="auto-rotate">Auto-rotate</Label>
          <Switch id="auto-rotate" checked={autoRotate} onCheckedChange={setAutoRotate} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="scale">Scale</Label>
            <span className="text-sm text-muted-foreground">{scale.toFixed(1)}x</span>
          </div>
          <Slider id="scale" min={0.1} max={3} step={0.1} value={[scale]} onValueChange={handleScaleChange} />
        </div>
      </div>
    </div>
  )
}

