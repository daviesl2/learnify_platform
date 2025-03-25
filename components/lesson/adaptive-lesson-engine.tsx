"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useAccessibility } from "@/providers/enhanced-accessibility-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DyslexiaFriendlyText } from "@/components/dyslexia-friendly-text"
import { TextToSpeech } from "@/components/text-to-speech"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Image,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  RotateCcw,
  Award,
} from "lucide-react"

interface LessonStep {
  id: string
  type: "concrete" | "pictorial" | "abstract"
  content: string
  imageUrl?: string
  question?: {
    text: string
    options?: string[]
    correctAnswer?: string
    explanation?: string
  }
  interactiveElements?: any
  difficultyLevel: 1 | 2 | 3 | 4 | 5
}

interface AdaptiveLessonEngineProps {
  lessonId: string
  subject: string
  topic: string
  initialDifficulty?: number
}

export function AdaptiveLessonEngine({ lessonId, subject, topic, initialDifficulty = 3 }: AdaptiveLessonEngineProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { settings } = useAccessibility()

  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [userResponses, setUserResponses] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [difficultyLevel, setDifficultyLevel] = useState(initialDifficulty)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [incorrectAnswers, setIncorrectAnswers] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [earnedXP, setEarnedXP] = useState(0)
  const [adaptiveHints, setAdaptiveHints] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState<"concrete" | "pictorial" | "abstract">("concrete")

  // Fetch lesson data
  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/lessons/${lessonId}?difficulty=${difficultyLevel}`)
        const data = await response.json()

        if (data.success) {
          setLessonSteps(data.steps)

          // Group steps by phase to ensure we have all three phases
          const concreteSteps = data.steps.filter((step: LessonStep) => step.type === "concrete")
          const pictorialSteps = data.steps.filter((step: LessonStep) => step.type === "pictorial")
          const abstractSteps = data.steps.filter((step: LessonStep) => step.type === "abstract")

          // Ensure we have at least one step for each phase
          if (concreteSteps.length === 0 || pictorialSteps.length === 0 || abstractSteps.length === 0) {
            console.error("Lesson is missing one or more CPA phases")
          }
        }
      } catch (error) {
        console.error("Error fetching lesson data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLessonData()
  }, [lessonId, difficultyLevel])

  // Adjust difficulty based on user performance
  useEffect(() => {
    if (correctAnswers + incorrectAnswers >= 3) {
      const successRate = correctAnswers / (correctAnswers + incorrectAnswers)

      // Adjust difficulty based on success rate
      if (successRate > 0.8 && difficultyLevel < 5) {
        setDifficultyLevel((prev) => Math.min(prev + 1, 5) as 1 | 2 | 3 | 4 | 5)
        generateAdaptiveHints("harder")
      } else if (successRate < 0.4 && difficultyLevel > 1) {
        setDifficultyLevel((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5)
        generateAdaptiveHints("easier")
      }
    }
  }, [correctAnswers, incorrectAnswers])

  // Track current phase
  useEffect(() => {
    if (lessonSteps.length > 0 && currentStepIndex < lessonSteps.length) {
      setCurrentPhase(lessonSteps[currentStepIndex].type)
    }
  }, [currentStepIndex, lessonSteps])

  const generateAdaptiveHints = (direction: "easier" | "harder") => {
    const currentStep = lessonSteps[currentStepIndex]
    if (!currentStep) return

    const hintsByPhase = {
      concrete: [
        "Try using physical objects to represent the problem",
        "Draw out the scenario step by step",
        "Think about a real-world example of this concept",
      ],
      pictorial: [
        "Look for patterns in the diagram",
        "Try to visualize how the elements relate to each other",
        "Connect this diagram to the concrete examples we saw earlier",
      ],
      abstract: [
        "Break down the formula into smaller parts",
        "Try substituting simple numbers to test your understanding",
        "Connect this abstract concept back to the pictorial representation",
      ],
    }

    const difficultyHints = {
      easier: [
        "Let's simplify this problem a bit",
        "Focus on just one part of the problem at a time",
        "We'll adjust the difficulty to help you build confidence",
      ],
      harder: [
        "Let's challenge you with a more complex version",
        "Now try applying this concept in a new context",
        "This more advanced problem will help deepen your understanding",
      ],
    }

    const phaseHints = hintsByPhase[currentStep.type]
    const levelHints = difficultyHints[direction]

    setAdaptiveHints([
      levelHints[Math.floor(Math.random() * levelHints.length)],
      phaseHints[Math.floor(Math.random() * phaseHints.length)],
    ])
  }

  const handleNextStep = () => {
    if (currentStepIndex < lessonSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
      setShowHint(false)
    } else {
      // Lesson complete
      completeLessonAndAwardXP()
    }
  }

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
      setShowHint(false)
    }
  }

  const handleAnswerSubmission = (answer: string) => {
    const currentStep = lessonSteps[currentStepIndex]
    const isCorrect = answer === currentStep.question?.correctAnswer

    // Update user responses
    setUserResponses({
      ...userResponses,
      [currentStep.id]: {
        answer,
        isCorrect,
      },
    })

    // Update correct/incorrect counters
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1)
    } else {
      setIncorrectAnswers((prev) => prev + 1)
    }

    // Move to next step after a short delay
    setTimeout(() => {
      handleNextStep()
    }, 1500)
  }

  const completeLessonAndAwardXP = async () => {
    try {
      // Calculate XP based on difficulty and performance
      const baseXP = 10
      const difficultyMultiplier = difficultyLevel
      const performanceMultiplier = Math.max(0.5, correctAnswers / (correctAnswers + incorrectAnswers))
      const calculatedXP = Math.round(baseXP * difficultyMultiplier * performanceMultiplier)

      // Save progress and award XP
      const response = await fetch("/api/progress/lesson-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          responses: userResponses,
          difficultyLevel,
          xpEarned: calculatedXP,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEarnedXP(calculatedXP)
        setLessonComplete(true)
      }
    } catch (error) {
      console.error("Error completing lesson:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Loading lesson content...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (lessonComplete) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className={`text-center ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              Lesson Complete!
              {settings.textToSpeechEnabled && <TextToSpeech text="Lesson Complete!" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-6">
              <Award className="h-24 w-24 text-primary" />
              <div className="text-center">
                <h3 className={`text-2xl font-bold ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                  You earned {earnedXP} XP!
                </h3>
                <p className={`mt-2 text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                  <DyslexiaFriendlyText>
                    Great job completing this lesson on {topic}. You answered {correctAnswers} questions correctly!
                  </DyslexiaFriendlyText>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <h4 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        Difficulty Level
                      </h4>
                      <p className="text-3xl font-bold mt-2">{difficultyLevel}/5</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <h4 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>Accuracy</h4>
                      <p className="text-3xl font-bold mt-2">
                        {Math.round((correctAnswers / (correctAnswers + incorrectAnswers)) * 100)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <h4 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>XP Earned</h4>
                      <p className="text-3xl font-bold mt-2">{earnedXP}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-4 mt-6">
                <Button onClick={() => router.push(`/dashboard`)}>Return to Dashboard</Button>
                <Button variant="outline" onClick={() => router.push(`/subjects/${subject}`)}>
                  More {subject} Lessons
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStep = lessonSteps[currentStepIndex]
  if (!currentStep) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>No lesson content available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPhaseIcon = (phase: "concrete" | "pictorial" | "abstract") => {
    switch (phase) {
      case "concrete":
        return <BookOpen className="h-5 w-5" />
      case "pictorial":
        return <Image className="h-5 w-5" />
      case "abstract":
        return <Calculator className="h-5 w-5" />
    }
  }

  const renderStepContent = () => {
    return (
      <div className="space-y-6">
        {currentStep.imageUrl && (
          <div className="flex justify-center">
            <img
              src={currentStep.imageUrl || "/placeholder.svg"}
              alt={`Visual for ${topic}`}
              className="max-h-64 object-contain rounded-lg"
            />
          </div>
        )}

        <div className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
          <DyslexiaFriendlyText>{currentStep.content}</DyslexiaFriendlyText>
          {settings.textToSpeechEnabled && <TextToSpeech text={currentStep.content} />}
        </div>

        {currentStep.question && (
          <div className="mt-6 space-y-4">
            <h3 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              {currentStep.question.text}
              {settings.textToSpeechEnabled && <TextToSpeech text={currentStep.question.text} />}
            </h3>

            {currentStep.question.options && (
              <div className="grid grid-cols-1 gap-2">
                {currentStep.question.options.map((option, index) => {
                  const hasAnswered = userResponses[currentStep.id]?.answer === option
                  const isCorrect = option === currentStep.question?.correctAnswer

                  let buttonVariant: "default" | "outline" | "secondary" | "destructive" | "ghost" = "outline"

                  if (hasAnswered) {
                    buttonVariant = isCorrect ? "default" : "destructive"
                  }

                  return (
                    <Button
                      key={index}
                      variant={buttonVariant}
                      className="justify-start text-left h-auto py-3"
                      onClick={() => handleAnswerSubmission(option)}
                      disabled={!!userResponses[currentStep.id]}
                    >
                      <span className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{option}</span>
                      {hasAnswered && isCorrect && <Check className="ml-auto h-5 w-5" />}
                      {hasAnswered && !isCorrect && <X className="ml-auto h-5 w-5" />}
                    </Button>
                  )
                })}
              </div>
            )}

            {userResponses[currentStep.id] && currentStep.question.explanation && (
              <div
                className={`p-4 rounded-lg ${userResponses[currentStep.id].isCorrect ? "bg-green-50" : "bg-red-50"}`}
              >
                <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                  <DyslexiaFriendlyText>{currentStep.question.explanation}</DyslexiaFriendlyText>
                </p>
              </div>
            )}
          </div>
        )}

        {showHint && adaptiveHints.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>Hint:</h4>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {adaptiveHints.map((hint, index) => (
                <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                  <DyslexiaFriendlyText>{hint}</DyslexiaFriendlyText>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{topic}</CardTitle>
              <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                {subject} - Lesson {lessonId}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <span>Difficulty:</span>
                <span className="font-bold">{difficultyLevel}/5</span>
              </Badge>

              <Badge variant="outline" className="flex items-center gap-1">
                <span>Phase:</span>
                <span className="capitalize">{currentPhase}</span>
                {renderPhaseIcon(currentPhase)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>
                {currentStepIndex + 1} of {lessonSteps.length}
              </span>
            </div>
            <Progress value={((currentStepIndex + 1) / lessonSteps.length) * 100} />
          </div>

          <Tabs defaultValue="lesson" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="concrete" disabled={currentPhase !== "concrete"} className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>Concrete</span>
              </TabsTrigger>
              <TabsTrigger
                value="pictorial"
                disabled={currentPhase !== "pictorial"}
                className="flex items-center gap-1"
              >
                <Image className="h-4 w-4" />
                <span>Pictorial</span>
              </TabsTrigger>
              <TabsTrigger value="abstract" disabled={currentPhase !== "abstract"} className="flex items-center gap-1">
                <Calculator className="h-4 w-4" />
                <span>Abstract</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="concrete" className={currentPhase === "concrete" ? "block" : "hidden"}>
              {renderStepContent()}
            </TabsContent>

            <TabsContent value="pictorial" className={currentPhase === "pictorial" ? "block" : "hidden"}>
              {renderStepContent()}
            </TabsContent>

            <TabsContent value="abstract" className={currentPhase === "abstract" ? "block" : "hidden"}>
              {renderStepContent()}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button variant="outline" onClick={() => setShowHint(!showHint)} className="flex items-center gap-1">
              {showHint ? <RotateCcw className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
              {showHint ? "Hide Hint" : "Show Hint"}
            </Button>
          </div>

          <Button
            onClick={handleNextStep}
            disabled={currentStep.question && !userResponses[currentStep.id]}
            className="flex items-center gap-1"
          >
            {currentStep.question && !userResponses[currentStep.id] ? "Answer Question" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

