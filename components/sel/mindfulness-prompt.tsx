"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Check, Clock } from "lucide-react"

interface MindfulnessPrompt {
  id: string
  content: string
  category: string
}

interface MindfulnessPromptGeneratorProps {
  userId: string
  onComplete?: (promptId: string, response: string) => Promise<void>
}

export function MindfulnessPromptGenerator({ userId, onComplete }: MindfulnessPromptGeneratorProps) {
  const [prompt, setPrompt] = useState<MindfulnessPrompt | null>(null)
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(60) // 1 minute timer
  const [timerActive, setTimerActive] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Fetch a mindfulness prompt when the component mounts
  useEffect(() => {
    fetchPrompt()
  }, [])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
    } else if (timerActive && timeRemaining === 0) {
      setTimerActive(false)
    }

    return () => clearInterval(interval)
  }, [timerActive, timeRemaining])

  const fetchPrompt = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/sel/mindfulness-prompts/daily")
      const data = await response.json()

      if (data.prompt) {
        setPrompt(data.prompt)
      }
    } catch (error) {
      console.error("Error fetching mindfulness prompt:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTimer = () => {
    setTimeRemaining(60)
    setTimerActive(true)
  }

  const handleSubmit = async () => {
    if (!prompt || !response.trim()) return

    setIsSubmitting(true)

    try {
      const apiResponse = await fetch("/api/sel/mindfulness-prompts/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptId: prompt.id,
          response: response.trim(),
        }),
      })

      if (!apiResponse.ok) {
        throw new Error("Failed to submit response")
      }

      // Call the onComplete callback if provided
      if (onComplete) {
        await onComplete(prompt.id, response.trim())
      }

      setCompleted(true)
    } catch (error) {
      console.error("Error submitting response:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Daily Mindfulness</CardTitle>
            <CardDescription>Take a moment to pause and reflect</CardDescription>
          </div>
          {prompt && (
            <Badge variant="outline" className="capitalize">
              {prompt.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : completed ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-center">Mindfulness Complete!</h3>
            <p className="text-center text-muted-foreground">
              Great job taking time for yourself today. Come back tomorrow for a new prompt.
            </p>
          </div>
        ) : prompt ? (
          <>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-lg">{prompt.content}</p>
            </div>

            {timerActive ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time Remaining</span>
                  <span className="text-sm font-mono">{formatTime(timeRemaining)}</span>
                </div>
                <Progress value={(timeRemaining / 60) * 100} />
              </div>
            ) : timeRemaining === 0 ? (
              <div className="space-y-2">
                <label htmlFor="response" className="text-sm font-medium">
                  Your Reflection
                </label>
                <Textarea
                  id="response"
                  placeholder="Write your thoughts and reflections here..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <Button onClick={handleStartTimer}>
                  <Clock className="mr-2 h-4 w-4" />
                  Start 1-Minute Mindfulness
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No prompt available.</p>
            <Button variant="outline" onClick={fetchPrompt} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
      </CardContent>

      {prompt && !isLoading && !completed && timeRemaining === 0 && (
        <CardFooter>
          <Button onClick={handleSubmit} disabled={!response.trim() || isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Complete Mindfulness Practice"}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

