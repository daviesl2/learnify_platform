"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useAccessibility } from "@/providers/enhanced-accessibility-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DyslexiaFriendlyText } from "@/components/dyslexia-friendly-text"
import { TextToSpeech } from "@/components/text-to-speech"
import { BookOpen, Map, Zap, CheckCircle, AlertCircle, ArrowRight, Brain, BarChart, Lightbulb } from "lucide-react"

interface LearningNode {
  id: string
  title: string
  description: string
  type: "lesson" | "quiz" | "practice" | "project" | "diagnostic"
  status: "locked" | "available" | "in-progress" | "completed"
  difficulty: 1 | 2 | 3 | 4 | 5
  estimatedTime: string
  prerequisites: string[]
  skills: string[]
  xpReward: number
}

interface LearningPath {
  id: string
  title: string
  description: string
  subject: string
  topic: string
  nodes: LearningNode[]
  userProgress: {
    currentNodeId: string
    completedNodeIds: string[]
    masteredSkills: string[]
    inProgressSkills: string[]
    overallProgress: number
  }
}

interface AdaptiveLearningPathProps {
  subjectId: string
  initialTopic?: string
  studentId?: string
}

export function AdaptiveLearningPath({ subjectId, initialTopic, studentId }: AdaptiveLearningPathProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { settings } = useAccessibility()

  const [learningPath, setLearningPath] = useState<LearningPath | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [diagnosticCompleted, setDiagnosticCompleted] = useState(false)
  const [diagnosticResponses, setDiagnosticResponses] = useState<Record<string, any>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("path")
  const [learningInsights, setLearningInsights] = useState<any | null>(null)

  useEffect(() => {
    fetchLearningPath()
  }, [subjectId, initialTopic])

  const fetchLearningPath = async () => {
    try {
      setIsLoading(true)

      const userId = studentId || session?.user.id
      if (!userId) return

      const response = await fetch(
        `/api/learning-paths?subjectId=${subjectId}${initialTopic ? `&topic=${initialTopic}` : ""}&userId=${userId}`,
      )

      const data = await response.json()

      if (data.success) {
        setLearningPath(data.learningPath)

        // Check if we need to show diagnostic
        const needsDiagnostic =
          !data.learningPath.userProgress.currentNodeId || data.learningPath.userProgress.overallProgress === 0

        setShowDiagnostic(needsDiagnostic && !diagnosticCompleted)

        if (needsDiagnostic && !diagnosticCompleted) {
          fetchDiagnosticQuestions()
        }

        // Fetch learning insights
        fetchLearningInsights(userId)
      }
    } catch (error) {
      console.error("Error fetching learning path:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDiagnosticQuestions = async () => {
    try {
      const response = await fetch(
        `/api/learning-paths/diagnostic?subjectId=${subjectId}${initialTopic ? `&topic=${initialTopic}` : ""}`,
      )

      const data = await response.json()

      if (data.success) {
        setDiagnosticQuestions(data.questions)
      }
    } catch (error) {
      console.error("Error fetching diagnostic questions:", error)
    }
  }

  const fetchLearningInsights = async (userId: string) => {
    try {
      const response = await fetch(`/api/learning-paths/insights?subjectId=${subjectId}&userId=${userId}`)

      const data = await response.json()

      if (data.success) {
        setLearningInsights(data.insights)
      }
    } catch (error) {
      console.error("Error fetching learning insights:", error)
    }
  }

  const handleDiagnosticAnswer = (questionId: string, answer: string) => {
    setDiagnosticResponses({
      ...diagnosticResponses,
      [questionId]: answer,
    })

    if (currentQuestionIndex < diagnosticQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered
      submitDiagnostic()
    }
  }

  const submitDiagnostic = async () => {
    try {
      const response = await fetch("/api/learning-paths/diagnostic/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjectId,
          topic: initialTopic,
          responses: diagnosticResponses,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setDiagnosticCompleted(true)
        setShowDiagnostic(false)

        // Update learning path based on diagnostic results
        if (data.updatedLearningPath) {
          setLearningPath(data.updatedLearningPath)
        } else {
          // Refetch the learning path if not provided in response
          fetchLearningPath()
        }
      }
    } catch (error) {
      console.error("Error submitting diagnostic:", error)
    }
  }

  const startLearningNode = (nodeId: string) => {
    const node = learningPath?.nodes.find((n) => n.id === nodeId)

    if (!node) return

    // Navigate to the appropriate page based on node type
    switch (node.type) {
      case "lesson":
        router.push(`/lessons/${nodeId}`)
        break
      case "quiz":
        router.push(`/quizzes/${nodeId}`)
        break
      case "practice":
        router.push(`/practice/${nodeId}`)
        break
      case "project":
        router.push(`/projects/${nodeId}`)
        break
      case "diagnostic":
        setShowDiagnostic(true)
        break
      default:
        router.push(`/lessons/${nodeId}`)
    }
  }

  const renderDiagnosticQuiz = () => {
    if (diagnosticQuestions.length === 0) {
      return (
        <div className="text-center py-6">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className={`mt-4 text-lg font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
            No diagnostic questions available
          </h3>
          <Button
            className="mt-4"
            onClick={() => {
              setShowDiagnostic(false)
              setDiagnosticCompleted(true)
            }}
          >
            Skip Diagnostic
          </Button>
        </div>
      )
    }

    const currentQuestion = diagnosticQuestions[currentQuestionIndex]

    return (
      <Card>
        <CardHeader>
          <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
            Learning Path Diagnostic
            {settings.textToSpeechEnabled && <TextToSpeech text="Learning Path Diagnostic" />}
          </CardTitle>
          <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
            <DyslexiaFriendlyText>
              Answer these questions to help us personalize your learning path
            </DyslexiaFriendlyText>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>
                Question {currentQuestionIndex + 1} of {diagnosticQuestions.length}
              </span>
              <span>{Math.round(((currentQuestionIndex + 1) / diagnosticQuestions.length) * 100)}%</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / diagnosticQuestions.length) * 100} />
          </div>

          <div className="space-y-4">
            <h3 className={`text-lg font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              {currentQuestion.question}
              {settings.textToSpeechEnabled && <TextToSpeech text={currentQuestion.question} />}
            </h3>

            <div className="grid grid-cols-1 gap-2 mt-4">
              {currentQuestion.options.map((option: string, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto py-3"
                  onClick={() => handleDiagnosticAnswer(currentQuestion.id, option)}
                >
                  <span className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{option}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(currentQuestionIndex - 1)
              }
            }}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setShowDiagnostic(false)
              setDiagnosticCompleted(true)
            }}
          >
            Skip Diagnostic
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Loading your personalized learning path...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showDiagnostic) {
    return renderDiagnosticQuiz()
  }

  if (!learningPath) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className={`mt-4 text-lg font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                No learning path available
              </h3>
              <p className={`text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                <DyslexiaFriendlyText>
                  We couldn't find a learning path for this subject and topic.
                </DyslexiaFriendlyText>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "available":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "locked":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "Beginner"
      case 2:
        return "Elementary"
      case 3:
        return "Intermediate"
      case 4:
        return "Advanced"
      case 5:
        return "Expert"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                {learningPath.title}
                {settings.textToSpeechEnabled && <TextToSpeech text={learningPath.title} />}
              </CardTitle>
              <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                <DyslexiaFriendlyText>{learningPath.description}</DyslexiaFriendlyText>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{learningPath.subject}</span>
              </Badge>

              <Badge variant="outline" className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span>{learningPath.topic}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{Math.round(learningPath.userProgress.overallProgress)}%</span>
            </div>
            <Progress value={learningPath.userProgress.overallProgress} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="path" className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span>Learning Path</span>
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span>Skills</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4" />
                <span>Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="path" className="space-y-4 pt-4">
              <div className="space-y-4">
                {learningPath.nodes.map((node) => {
                  const isCurrentNode = node.id === learningPath.userProgress.currentNodeId
                  const isCompleted = learningPath.userProgress.completedNodeIds.includes(node.id)
                  const isAvailable = node.status === "available" || isCurrentNode || isCompleted

                  return (
                    <Card key={node.id} className={`border-l-4 ${getNodeStatusColor(node.status)}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <h3 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                              {node.title}
                              {isCurrentNode && <Badge className="ml-2 bg-blue-100 text-blue-800">Current</Badge>}
                            </h3>
                            <p
                              className={`text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
                            >
                              <DyslexiaFriendlyText>{node.description}</DyslexiaFriendlyText>
                            </p>

                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="capitalize">
                                {node.type}
                              </Badge>
                              <Badge variant="outline">{getDifficultyLabel(node.difficulty)}</Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                <span>{node.xpReward} XP</span>
                              </Badge>
                            </div>
                          </div>

                          <Button
                            onClick={() => startLearningNode(node.id)}
                            disabled={!isAvailable}
                            className="whitespace-nowrap"
                          >
                            {isCompleted ? "Review" : isCurrentNode ? "Continue" : "Start"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Mastered Skills
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {learningPath.userProgress.masteredSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {learningPath.userProgress.masteredSkills.map((skill, index) => (
                          <Badge key={index} className="bg-green-100 text-green-800 border-green-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <DyslexiaFriendlyText>You haven't mastered any skills yet. Keep learning!</DyslexiaFriendlyText>
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        In-Progress Skills
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {learningPath.userProgress.inProgressSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {learningPath.userProgress.inProgressSkills.map((skill, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800 border-blue-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <DyslexiaFriendlyText>
                          You don't have any skills in progress. Start a learning node to begin!
                        </DyslexiaFriendlyText>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                    <div className="flex items-center gap-2">
                      <Map className="h-5 w-5 text-purple-500" />
                      Upcoming Skills
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {learningPath.nodes
                      .filter((node) => node.status === "available" || node.status === "locked")
                      .flatMap((node) => node.skills)
                      .filter(
                        (skill) =>
                          !learningPath.userProgress.masteredSkills.includes(skill) &&
                          !learningPath.userProgress.inProgressSkills.includes(skill),
                      )
                      .filter((skill, index, self) => self.indexOf(skill) === index) // Remove duplicates
                      .slice(0, 10) // Show only first 10
                      .map((skill, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{skill}</span>
                          <Badge variant="outline">Upcoming</Badge>
                        </div>
                      ))}

                    {learningPath.nodes
                      .filter((node) => node.status === "available" || node.status === "locked")
                      .flatMap((node) => node.skills)
                      .filter(
                        (skill) =>
                          !learningPath.userProgress.masteredSkills.includes(skill) &&
                          !learningPath.userProgress.inProgressSkills.includes(skill),
                      )
                      .filter((skill, index, self) => self.indexOf(skill) === index).length === 0 && (
                      <p className={`text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <DyslexiaFriendlyText>
                          No upcoming skills found. You might have completed all available skills!
                        </DyslexiaFriendlyText>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 pt-4">
              {learningInsights ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <div className="flex items-center gap-2">
                          <BarChart className="h-5 w-5 text-blue-500" />
                          Learning Patterns
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                            Strengths
                          </h4>
                          <ul className="mt-2 space-y-1 pl-6 list-disc">
                            {learningInsights.strengths.map((strength: string, index: number) => (
                              <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                                <DyslexiaFriendlyText>{strength}</DyslexiaFriendlyText>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                            Areas for Growth
                          </h4>
                          <ul className="mt-2 space-y-1 pl-6 list-disc">
                            {learningInsights.areasForGrowth.map((area: string, index: number) => (
                              <li key={index} className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                                <DyslexiaFriendlyText>{area}</DyslexiaFriendlyText>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          Personalized Recommendations
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {learningInsights.recommendations.map((recommendation: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <h4 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                              {recommendation.title}
                            </h4>
                            <p
                              className={`mt-1 text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
                            >
                              <DyslexiaFriendlyText>{recommendation.description}</DyslexiaFriendlyText>
                            </p>
                            {recommendation.actionUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => router.push(recommendation.actionUrl)}
                              >
                                {recommendation.actionText || "View"}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-500" />
                          Learning Style
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                            Primary Learning Style
                          </h4>
                          <div className="mt-2 p-4 bg-purple-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-100 text-purple-800">
                                {learningInsights.learningStyle.primary}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {learningInsights.learningStyle.primaryPercentage}%
                              </span>
                            </div>
                            <p className={`mt-2 text-sm ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                              <DyslexiaFriendlyText>
                                {learningInsights.learningStyle.primaryDescription}
                              </DyslexiaFriendlyText>
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                            Secondary Learning Styles
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {learningInsights.learningStyle.secondary.map((style: any, index: number) => (
                              <Badge key={index} variant="outline">
                                {style.name} ({style.percentage}%)
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className={`mt-4 text-lg font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                    No learning insights available
                  </h3>
                  <p className={`text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                    <DyslexiaFriendlyText>
                      Complete more lessons and quizzes to generate learning insights.
                    </DyslexiaFriendlyText>
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push(`/subjects/${learningPath.subject.toLowerCase()}`)}>
            Back to {learningPath.subject}
          </Button>

          <Button onClick={() => setShowDiagnostic(true)} className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            Retake Diagnostic
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

