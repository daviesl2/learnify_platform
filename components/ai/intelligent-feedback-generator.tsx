"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useAccessibility } from "@/providers/enhanced-accessibility-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DyslexiaFriendlyText } from "@/components/dyslexia-friendly-text"
import { TextToSpeech } from "@/components/text-to-speech"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Lightbulb, CheckCircle, XCircle, HelpCircle, BookOpen, Brain, Sparkles } from "lucide-react"

interface IntelligentFeedbackGeneratorProps {
  studentResponse: string
  questionContext: string
  subject: string
  topic: string
  correctAnswer?: string
  studentId?: string
  questionId?: string
  onFeedbackGenerated?: (feedback: FeedbackData) => void
}

interface FeedbackData {
  overallFeedback: string
  strengthPoints: string[]
  improvementPoints: string[]
  nextSteps: string[]
  conceptualUnderstanding: "excellent" | "good" | "partial" | "limited" | "unclear"
  suggestedResources: {
    title: string
    type: string
    url?: string
    description: string
  }[]
  misconceptions?: string[]
}

export function IntelligentFeedbackGenerator({
  studentResponse,
  questionContext,
  subject,
  topic,
  correctAnswer,
  studentId,
  questionId,
  onFeedbackGenerated,
}: IntelligentFeedbackGeneratorProps) {
  const { data: session } = useSession()
  const { settings } = useAccessibility()

  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("feedback")
  const [error, setError] = useState<string | null>(null)
  const [studentHistory, setStudentHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    if (studentResponse && questionContext) {
      generateFeedback()
    }
  }, [studentResponse, questionContext])

  useEffect(() => {
    if (studentId && session?.user.role === "TEACHER") {
      fetchStudentHistory()
    }
  }, [studentId, session?.user.role])

  const fetchStudentHistory = async () => {
    if (!studentId) return

    try {
      setIsLoadingHistory(true)
      const response = await fetch(`/api/students/${studentId}/learning-history?subject=${subject}`)
      const data = await response.json()

      if (data.success) {
        setStudentHistory(data.history)
      }
    } catch (error) {
      console.error("Error fetching student history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const generateFeedback = async () => {
    try {
      setIsGenerating(true)
      setError(null)

      const response = await fetch("/api/ai/generate-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentResponse,
          questionContext,
          subject,
          topic,
          correctAnswer,
          studentId,
          questionId,
          studentHistory: studentHistory.length > 0 ? studentHistory : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setFeedback(data.feedback)
        if (onFeedbackGenerated) {
          onFeedbackGenerated(data.feedback)
        }
      } else {
        setError(data.message || "Failed to generate feedback")
      }
    } catch (error) {
      console.error("Error generating feedback:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const getUnderstandingColor = (level: string) => {
    switch (level) {
      case "excellent":
        return "bg-green-100 text-green-800"
      case "good":
        return "bg-blue-100 text-blue-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
      case "limited":
        return "bg-orange-100 text-orange-800"
      case "unclear":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Generating Feedback</CardTitle>
          <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
            <DyslexiaFriendlyText>
              Our AI is analyzing your response and generating personalized feedback...
            </DyslexiaFriendlyText>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-4">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Error Generating Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{error}</p>
          </div>
          <Button onClick={generateFeedback} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>No Feedback Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
            <DyslexiaFriendlyText>
              Please provide a student response and question context to generate feedback.
            </DyslexiaFriendlyText>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
              Personalized Feedback
              {settings.textToSpeechEnabled && <TextToSpeech text="Personalized Feedback" />}
            </CardTitle>
            <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
              <DyslexiaFriendlyText>AI-generated feedback for your response on {topic}</DyslexiaFriendlyText>
            </CardDescription>
          </div>

          <Badge className={`${getUnderstandingColor(feedback.conceptualUnderstanding)} capitalize`}>
            {feedback.conceptualUnderstanding} Understanding
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feedback" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              <span>Insights</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>Resources</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4 pt-4">
            <div className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
              <DyslexiaFriendlyText>{feedback.overallFeedback}</DyslexiaFriendlyText>
              {settings.textToSpeechEnabled && <TextToSpeech text={feedback.overallFeedback} />}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h3
                  className={`text-sm font-medium flex items-center gap-1 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Strengths
                </h3>
                <ul className="mt-2 space-y-1 pl-6 list-disc">
                  {feedback.strengthPoints.map((point, index) => (
                    <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                      <DyslexiaFriendlyText>{point}</DyslexiaFriendlyText>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3
                  className={`text-sm font-medium flex items-center gap-1 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
                >
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                  Areas for Improvement
                </h3>
                <ul className="mt-2 space-y-1 pl-6 list-disc">
                  {feedback.improvementPoints.map((point, index) => (
                    <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                      <DyslexiaFriendlyText>{point}</DyslexiaFriendlyText>
                    </li>
                  ))}
                </ul>
              </div>

              {feedback.misconceptions && feedback.misconceptions.length > 0 && (
                <div>
                  <h3
                    className={`text-sm font-medium flex items-center gap-1 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                    Possible Misconceptions
                  </h3>
                  <ul className="mt-2 space-y-1 pl-6 list-disc">
                    {feedback.misconceptions.map((misconception, index) => (
                      <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                        <DyslexiaFriendlyText>{misconception}</DyslexiaFriendlyText>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 pt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3
                className={`text-sm font-medium flex items-center gap-1 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
              >
                <Brain className="h-4 w-4 text-blue-500" />
                Conceptual Understanding
              </h3>
              <p className={`mt-2 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                <DyslexiaFriendlyText>
                  Based on your response, you have a {feedback.conceptualUnderstanding} understanding of {topic}.
                </DyslexiaFriendlyText>
              </p>
            </div>

            <div>
              <h3
                className={`text-sm font-medium flex items-center gap-1 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                Next Steps
              </h3>
              <ul className="mt-2 space-y-2 pl-6 list-disc">
                {feedback.nextSteps.map((step, index) => (
                  <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                    <DyslexiaFriendlyText>{step}</DyslexiaFriendlyText>
                  </li>
                ))}
              </ul>
            </div>

            {studentHistory.length > 0 && session?.user.role === "TEACHER" && (
              <div className="mt-6 border-t pt-4">
                <h3 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                  Learning History Insights
                </h3>
                <p className={`mt-2 text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                  <DyslexiaFriendlyText>
                    This feedback takes into account the student's previous performance in {subject}.
                  </DyslexiaFriendlyText>
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 pt-4">
            <h3 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              Recommended Resources
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedback.suggestedResources.map((resource, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className={`text-sm ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                      {resource.title}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {resource.type}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className={`text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                      <DyslexiaFriendlyText>{resource.description}</DyslexiaFriendlyText>
                    </p>
                  </CardContent>
                  {resource.url && (
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          View Resource
                        </a>
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={generateFeedback}>
          Regenerate Feedback
        </Button>

        {settings.textToSpeechEnabled && (
          <Button
            variant="outline"
            onClick={() => {
              if (activeTab === "feedback") {
                const text = `${feedback.overallFeedback} Strengths: ${feedback.strengthPoints.join(". ")} Areas for improvement: ${feedback.improvementPoints.join(". ")}`
                const speechSynthesis = window.speechSynthesis
                const utterance = new SpeechSynthesisUtterance(text)
                speechSynthesis.speak(utterance)
              }
            }}
          >
            Read Aloud
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

