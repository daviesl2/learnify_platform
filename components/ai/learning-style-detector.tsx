"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Radar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"

// Learning style types
type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic"

// Learning style profile
interface LearningStyleProfile {
  visual: number
  auditory: number
  reading: number
  kinesthetic: number
  dominantStyle: LearningStyle
}

// Question interface
interface Question {
  id: number
  text: string
  category: LearningStyle
}

// Sample questions for learning style assessment
const learningStyleQuestions: Question[] = [
  {
    id: 1,
    text: "I prefer lessons with diagrams, charts, and pictures.",
    category: "visual",
  },
  {
    id: 2,
    text: "I remember information better when I see it written down.",
    category: "visual",
  },
  {
    id: 3,
    text: "I enjoy listening to explanations rather than reading them.",
    category: "auditory",
  },
  {
    id: 4,
    text: "I learn best through discussions and talking things through.",
    category: "auditory",
  },
  {
    id: 5,
    text: "I prefer to read instructions rather than have someone explain them to me.",
    category: "reading",
  },
  {
    id: 6,
    text: "I take detailed notes during lessons to review later.",
    category: "reading",
  },
  {
    id: 7,
    text: "I learn best when I can touch and interact with materials.",
    category: "kinesthetic",
  },
  {
    id: 8,
    text: "I prefer to learn by doing activities rather than listening to explanations.",
    category: "kinesthetic",
  },
]

export default function LearningStyleDetector() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [learningProfile, setLearningProfile] = useState<LearningStyleProfile | null>(null)
  const [progress, setProgress] = useState(0)

  // Update progress when answering questions
  useEffect(() => {
    const answeredCount = Object.keys(answers).length
    const totalQuestions = learningStyleQuestions.length
    setProgress((answeredCount / totalQuestions) * 100)
  }, [answers])

  // Handle answer selection
  const handleAnswer = (value: number) => {
    const updatedAnswers = { ...answers, [currentQuestionIndex]: value }
    setAnswers(updatedAnswers)

    if (currentQuestionIndex < learningStyleQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      calculateLearningStyle(updatedAnswers)
      setIsCompleted(true)
    }
  }

  // Calculate learning style based on answers
  const calculateLearningStyle = (responses: Record<number, number>) => {
    const scores = {
      visual: 0,
      auditory: 0,
      reading: 0,
      kinesthetic: 0,
    }

    // Calculate scores for each learning style
    Object.entries(responses).forEach(([questionIndex, value]) => {
      const question = learningStyleQuestions[Number.parseInt(questionIndex)]
      scores[question.category] += value
    })

    // Normalize scores to percentages
    const totalPossiblePerCategory = 10 // 2 questions per category × max score of 5
    const normalizedScores = {
      visual: (scores.visual / totalPossiblePerCategory) * 100,
      auditory: (scores.auditory / totalPossiblePerCategory) * 100,
      reading: (scores.reading / totalPossiblePerCategory) * 100,
      kinesthetic: (scores.kinesthetic / totalPossiblePerCategory) * 100,
    }

    // Determine dominant learning style
    const dominantStyle = Object.entries(normalizedScores).reduce(
      (max, [style, score]) => (score > max.score ? { style: style as LearningStyle, score } : max),
      { style: "visual" as LearningStyle, score: 0 },
    ).style

    setLearningProfile({
      ...normalizedScores,
      dominantStyle,
    })
  }

  // Reset the assessment
  const resetAssessment = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setIsCompleted(false)
    setLearningProfile(null)
    setProgress(0)
  }

  // Format data for radar chart
  const getChartData = () => {
    if (!learningProfile) return []

    return [
      {
        subject: "Visual",
        value: learningProfile.visual,
        fullMark: 100,
      },
      {
        subject: "Auditory",
        value: learningProfile.auditory,
        fullMark: 100,
      },
      {
        subject: "Reading/Writing",
        value: learningProfile.reading,
        fullMark: 100,
      },
      {
        subject: "Kinesthetic",
        value: learningProfile.kinesthetic,
        fullMark: 100,
      },
    ]
  }

  // Get learning style description
  const getLearningStyleDescription = (style: LearningStyle) => {
    const descriptions = {
      visual:
        "You learn best through visual aids like diagrams, charts, and videos. Try using color-coding, mind maps, and watching educational videos.",
      auditory:
        "You learn best by listening and discussing. Try recording lessons, participating in group discussions, and using verbal repetition.",
      reading:
        "You learn best through reading and writing. Try taking detailed notes, reading textbooks, and writing summaries of what you've learned.",
      kinesthetic:
        "You learn best through hands-on activities. Try experiments, role-playing, and building models to understand concepts.",
    }

    return descriptions[style]
  }

  // Get learning style strategies
  const getLearningStyleStrategies = (style: LearningStyle) => {
    const strategies = {
      visual: [
        "Use color-coding for notes and flashcards",
        "Create mind maps and diagrams",
        "Watch educational videos and animations",
        "Use visual metaphors and imagery",
        "Draw pictures to represent concepts",
      ],
      auditory: [
        "Record lessons to listen to later",
        "Participate in group discussions",
        "Read material aloud to yourself",
        "Use verbal repetition and mnemonics",
        "Explain concepts to others verbally",
      ],
      reading: [
        "Take detailed notes during lessons",
        "Rewrite key points in your own words",
        "Create written summaries of material",
        "Use lists and bullet points",
        "Read textbooks and reference materials",
      ],
      kinesthetic: [
        "Use hands-on experiments and activities",
        "Build models to understand concepts",
        "Take frequent breaks during study sessions",
        "Use role-playing to understand scenarios",
        "Apply concepts to real-world situations",
      ],
    }

    return strategies[style]
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Learning Style Assessment</CardTitle>
        <CardDescription>
          Discover your preferred learning style to personalize your educational experience
        </CardDescription>
        <Progress value={progress} className="w-full mt-2" />
      </CardHeader>

      <CardContent>
        {!isCompleted ? (
          <div className="space-y-6">
            <div className="text-lg font-medium">
              Question {currentQuestionIndex + 1} of {learningStyleQuestions.length}
            </div>

            <div className="text-xl mb-6">{learningStyleQuestions[currentQuestionIndex].text}</div>

            <div className="flex flex-col space-y-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={answers[currentQuestionIndex] === value ? "default" : "outline"}
                  onClick={() => handleAnswer(value)}
                  className="justify-start text-left h-auto py-3"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      {value}
                    </div>
                    <span>
                      {value === 1 && "Strongly Disagree"}
                      {value === 2 && "Disagree"}
                      {value === 3 && "Neutral"}
                      {value === 4 && "Agree"}
                      {value === 5 && "Strongly Agree"}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="strategies">Strategies</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 pt-4">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold">Your Dominant Learning Style</h3>
                  <div className="text-3xl font-bold text-primary mt-2 capitalize">
                    {learningProfile?.dominantStyle}
                  </div>
                </div>

                <p className="text-lg">
                  {learningProfile && getLearningStyleDescription(learningProfile.dominantStyle)}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <div className="font-medium">Visual</div>
                    <Progress value={learningProfile?.visual} />
                    <div className="text-sm text-right">{Math.round(learningProfile?.visual || 0)}%</div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Auditory</div>
                    <Progress value={learningProfile?.auditory} />
                    <div className="text-sm text-right">{Math.round(learningProfile?.auditory || 0)}%</div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Reading/Writing</div>
                    <Progress value={learningProfile?.reading} />
                    <div className="text-sm text-right">{Math.round(learningProfile?.reading || 0)}%</div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Kinesthetic</div>
                    <Progress value={learningProfile?.kinesthetic} />
                    <div className="text-sm text-right">{Math.round(learningProfile?.kinesthetic || 0)}%</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chart" className="pt-4">
                <div className="h-[350px] w-full">
                  <ChartContainer
                    config={{
                      value: {
                        label: "Score",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getChartData()}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Learning Style"
                          dataKey="value"
                          stroke="var(--color-value)"
                          fill="var(--color-value)"
                          fillOpacity={0.6}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </TabsContent>

              <TabsContent value="strategies" className="space-y-4 pt-4">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold">Recommended Learning Strategies</h3>
                  <p className="text-muted-foreground mt-1">
                    Based on your {learningProfile?.dominantStyle} learning style
                  </p>
                </div>

                <ul className="space-y-2">
                  {learningProfile &&
                    getLearningStyleStrategies(learningProfile.dominantStyle).map((strategy, index) => (
                      <li key={index} className="flex items-start">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">
                          {index + 1}
                        </div>
                        <span>{strategy}</span>
                      </li>
                    ))}
                </ul>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Did you know?</h4>
                  <p>
                    Most people have a mix of learning styles, but tend to favor one. Learnify will now adapt your
                    learning experience based on your profile, but you can always access content in different formats.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {!isCompleted ? (
          <>
            <Button
              variant="outline"
              onClick={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              {Object.keys(answers).length} of {learningStyleQuestions.length} answered
            </div>
            <Button
              variant="outline"
              onClick={() =>
                currentQuestionIndex < learningStyleQuestions.length - 1 &&
                setCurrentQuestionIndex(currentQuestionIndex + 1)
              }
              disabled={currentQuestionIndex === learningStyleQuestions.length - 1 || !answers[currentQuestionIndex]}
            >
              Next
            </Button>
          </>
        ) : (
          <Button onClick={resetAssessment} className="ml-auto">
            Retake Assessment
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

