"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Check, Clock, Video, Send } from "lucide-react"
import { format } from "date-fns"

interface TeachBackModeProps {
  userId: string
  assignmentId: string
  conceptName: string
  conceptDescription?: string
  role: "teacher" | "student"
  peerName: string
  onComplete?: (feedback: string, rating?: number) => Promise<void>
}

export function TeachBackMode({
  userId,
  assignmentId,
  conceptName,
  conceptDescription,
  role,
  peerName,
  onComplete,
}: TeachBackModeProps) {
  const [activeTab, setActiveTab] = useState("prepare")
  const [notes, setNotes] = useState("")
  const [questions, setQuestions] = useState("")
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [messages, setMessages] = useState<
    Array<{
      id: string
      sender: string
      content: string
      timestamp: Date
    }>
  >([])
  const [newMessage, setNewMessage] = useState("")
  const [isCompleted, setIsCompleted] = useState(false)

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRecording])

  const handleStartRecording = () => {
    setIsRecording(true)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // In a real implementation, this would save the recording
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message = {
      id: Date.now().toString(),
      sender: role === "teacher" ? "You" : peerName,
      content: newMessage.trim(),
      timestamp: new Date(),
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  const handleComplete = async () => {
    if (role === "student" && !rating) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/peer-teaching/assignments/${assignmentId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback,
          rating,
          role,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete teach-back session")
      }

      // Call the onComplete callback if provided
      if (onComplete) {
        await onComplete(feedback, rating || undefined)
      }

      setIsCompleted(true)
    } catch (error) {
      console.error("Error completing teach-back session:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isCompleted) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">Teach-Back Session Completed!</h3>
          <p className="text-center text-muted-foreground mb-6">
            {role === "teacher"
              ? "Your feedback has been submitted. Thank you for teaching!"
              : "Your feedback and rating have been submitted. Thank you for learning!"}
          </p>
          <Button onClick={() => (window.location.href = "/dashboard/peer-teaching")}>
            Return to Peer Teaching Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Teach-Back Session: {conceptName}</CardTitle>
            <CardDescription>
              {role === "teacher"
                ? `You are teaching ${peerName} about this concept`
                : `${peerName} is teaching you about this concept`}
            </CardDescription>
          </div>

          <Badge variant={role === "teacher" ? "default" : "secondary"}>
            {role === "teacher" ? "Teacher" : "Student"}
          </Badge>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prepare">Prepare</TabsTrigger>
            <TabsTrigger value="teach">{role === "teacher" ? "Teach" : "Learn"}</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="pt-6">
          <TabsContent value="prepare" className="mt-0">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <h3 className="font-medium mb-2">Concept: {conceptName}</h3>
                {conceptDescription && <p className="text-sm text-muted-foreground">{conceptDescription}</p>}
              </div>

              {role === "teacher" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Teaching Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Write your teaching notes here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      These notes are for your reference only and won't be shared with your student.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="questions">Potential Questions</Label>
                    <Textarea
                      id="questions"
                      placeholder="List questions you might ask to check understanding..."
                      value={questions}
                      onChange={(e) => setQuestions(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="questions">Questions to Ask</Label>
                    <Textarea
                      id="questions"
                      placeholder="Write down questions you want to ask during the session..."
                      value={questions}
                      onChange={(e) => setQuestions(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Learning Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Take notes during the session here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setActiveTab("teach")}>
                  Continue to {role === "teacher" ? "Teaching" : "Learning"} Session
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="teach" className="mt-0">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-4">
                  <div className="border rounded-md p-4 h-[300px] flex flex-col items-center justify-center bg-muted">
                    <Video className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Video Session</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Start a video call to explain the concept face-to-face.
                    </p>
                    <Button variant="outline">Start Video Call</Button>
                  </div>

                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Voice Recording</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Record an explanation to share with your {role === "teacher" ? "student" : "teacher"}.
                    </p>

                    {isRecording ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Recording...</span>
                          <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                        </div>
                        <Progress value={((recordingTime % 60) / 60) * 100} className="h-2" />
                        <Button variant="destructive" className="w-full mt-2" onClick={handleStopRecording}>
                          Stop Recording
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={handleStartRecording}>
                        <Clock className="mr-2 h-4 w-4" />
                        Start Recording
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 border rounded-md flex flex-col h-[400px]">
                  <div className="p-3 border-b">
                    <h3 className="font-medium">Chat with {role === "teacher" ? "Student" : "Teacher"}</h3>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No messages yet. Start the conversation!
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === "You" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.sender === "You" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {message.sender} • {format(message.timestamp, "h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setActiveTab("feedback")}>Continue to Feedback</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">
                  {role === "teacher"
                    ? "Provide feedback on the student's understanding"
                    : "Provide feedback on the teaching session"}
                </Label>
                <Textarea
                  id="feedback"
                  placeholder={`Share your thoughts on the ${role === "teacher" ? "learning" : "teaching"} experience...`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                />
              </div>

              {role === "student" && (
                <div className="space-y-2">
                  <Label>Rate the teaching session</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={rating === value ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setRating(value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">1 = Not helpful, 5 = Extremely helpful</p>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleComplete}
                  disabled={!feedback || (role === "student" && !rating) || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Teach-Back Session"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

