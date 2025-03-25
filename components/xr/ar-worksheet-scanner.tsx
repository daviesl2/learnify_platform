"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Camera, AlertTriangle, Check, X, RefreshCw } from "lucide-react"

interface ARWorksheetScannerProps {
  onScan: (imageData: string) => Promise<{
    success: boolean
    worksheetId?: string
    title?: string
    contentUrl?: string
  }>
  onComplete: (worksheetId: string) => void
}

export function ARWorksheetScanner({ onScan, onComplete }: ARWorksheetScannerProps) {
  const [cameraActive, setCameraActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    worksheetId?: string
    title?: string
    contentUrl?: string
  } | null>(null)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize camera when component mounts
  useEffect(() => {
    return () => {
      // Clean up camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
        setCameraPermission(true)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Unable to access camera. Please check permissions and try again.")
      setCameraPermission(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    setScanning(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data as base64 string
    const imageData = canvas.toDataURL("image/jpeg")

    // Process the captured image
    processImage(imageData)
  }

  const processImage = async (imageData: string) => {
    try {
      const result = await onScan(imageData)
      setScanResult(result)

      if (result.success && result.worksheetId) {
        onComplete(result.worksheetId)
      }
    } catch (err) {
      console.error("Error processing image:", err)
      setError("Failed to process the scanned image. Please try again.")
    } finally {
      setScanning(false)
    }
  }

  const resetScan = () => {
    setScanResult(null)
    setError(null)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Camera className="mr-2 h-5 w-5" />
          AR Worksheet Scanner
        </CardTitle>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Camera inactive</p>
            </div>
          )}

          {/* Scanning overlay */}
          {cameraActive && !scanResult && (
            <div className="absolute inset-0 border-2 border-primary border-dashed flex items-center justify-center">
              <div className="bg-primary/20 backdrop-blur-sm px-4 py-2 rounded-md">
                {scanning ? "Scanning..." : "Position worksheet in frame"}
              </div>
            </div>
          )}

          {/* Result overlay */}
          {scanResult && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              {scanResult.success ? (
                <>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Worksheet Recognized!</h3>
                  <p className="text-center mb-4">{scanResult.title}</p>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Worksheet Found</h3>
                  <p className="text-center mb-4">Try again with a different angle or better lighting.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>

      <CardFooter className="flex justify-between">
        {!cameraActive ? (
          <Button onClick={startCamera} className="w-full">
            Start Camera
          </Button>
        ) : scanResult ? (
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={resetScan} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan Another
            </Button>
            {scanResult.success && (
              <Button onClick={() => onComplete(scanResult.worksheetId!)} className="flex-1">
                View Content
              </Button>
            )}
          </div>
        ) : (
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={stopCamera} className="flex-1">
              Cancel
            </Button>
            <Button onClick={captureImage} disabled={scanning} className="flex-1">
              {scanning ? "Processing..." : "Scan Worksheet"}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

