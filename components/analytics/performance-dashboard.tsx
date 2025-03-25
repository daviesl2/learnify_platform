"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useAccessibility } from "@/providers/enhanced-accessibility-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DyslexiaFriendlyText } from "@/components/dyslexia-friendly-text"
import { TextToSpeech } from "@/components/text-to-speech"
import { BarChartIcon, LineChartIcon, TrendingUp, Clock, Award, BookOpen, Brain, Target, Download } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface PerformanceDashboardProps {
  userId?: string
  subjectId?: string
  timeRange?: "week" | "month" | "year" | "all"
  role?: "student" | "parent" | "teacher" | "admin"
}

export function PerformanceDashboard({
  userId,
  subjectId,
  timeRange: initialTimeRange = "month",
  role = "student",
}: PerformanceDashboardProps) {
  const { data: session } = useSession()
  const { settings } = useAccessibility()

  const [timeRange, setTimeRange] = useState(initialTimeRange)
  const [selectedSubject, setSelectedSubject] = useState(subjectId || "all")
  const [subjects, setSubjects] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [predictiveInsights, setPredictiveInsights] = useState<any | null>(null)

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (session || userId) {
      fetchPerformanceData()
    }
  }, [session, userId, selectedSubject, timeRange])

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subjects")
      const data = await response.json()

      if (data.success) {
        setSubjects(data.subjects)
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
    }
  }

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true)

      const targetUserId = userId || session?.user.id
      if (!targetUserId) return

      const response = await fetch(
        `/api/analytics/performance?userId=${targetUserId}&subjectId=${selectedSubject}&timeRange=${timeRange}`,
      )

      const data = await response.json()

      if (data.success) {
        setPerformanceData(data.performance)
        setPredictiveInsights(data.predictiveInsights || null)
      }
    } catch (error) {
      console.error("Error fetching performance data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const targetUserId = userId || session?.user.id
      if (!targetUserId) return

      const response = await fetch(
        `/api/analytics/export?userId=${targetUserId}&subjectId=${selectedSubject}&timeRange=${timeRange}`,
      )

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `performance_data_${timeRange}_${selectedSubject}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Loading performance data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!performanceData) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChartIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className={`mt-4 text-lg font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                No performance data available
              </h3>
              <p className={`text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                <DyslexiaFriendlyText>
                  Complete more lessons and quizzes to see your performance analytics.
                </DyslexiaFriendlyText>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getSubjectName = (id: string) => {
    if (id === "all") return "All Subjects"
    const subject = subjects.find((s) => s.id === id)
    return subject ? subject.name : "Unknown Subject"
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case "week":
        return "Past Week"
      case "month":
        return "Past Month"
      case "year":
        return "Past Year"
      case "all":
        return "All Time"
      default:
        return "Unknown Range"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }

    return `${mins}m`
  }

  const getColorByScore = (score: number) => {
    if (score >= 90) return "#10b981" // green-500
    if (score >= 75) return "#22c55e" // green-600
    if (score >= 60) return "#eab308" // yellow-500
    if (score >= 40) return "#f59e0b" // amber-500
    return "#ef4444" // red-500
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
            Performance Analytics
            {settings.textToSpeechEnabled && <TextToSpeech text="Performance Analytics" />}
          </h1>
          <p className={`text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
            <DyslexiaFriendlyText>Track your learning progress and performance over time</DyslexiaFriendlyText>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Subject" />
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

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportData} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Average Score
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{Math.round(performanceData.averageScore)}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {getSubjectName(selectedSubject)} • {getTimeRangeLabel(timeRange)}
              </p>

              {performanceData.scoreChange !== null && (
                <div
                  className={`flex items-center gap-1 mt-2 text-sm ${performanceData.scoreChange >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {performanceData.scoreChange >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        +{performanceData.scoreChange.toFixed(1)}% from previous {timeRange}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 rotate-180" />
                      <span>
                        {performanceData.scoreChange.toFixed(1)}% from previous {timeRange}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Study Time
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{formatTime(performanceData.totalStudyTime)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {getSubjectName(selectedSubject)} • {getTimeRangeLabel(timeRange)}
              </p>

              {performanceData.studyTimeChange !== null && (
                <div
                  className={`flex items-center gap-1 mt-2 text-sm ${performanceData.studyTimeChange >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {performanceData.studyTimeChange >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        +{formatTime(performanceData.studyTimeChange)} from previous {timeRange}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 rotate-180" />
                      <span>
                        {formatTime(Math.abs(performanceData.studyTimeChange))} less than previous {timeRange}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                XP Earned
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{performanceData.totalXP}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {getSubjectName(selectedSubject)} • {getTimeRangeLabel(timeRange)}
              </p>

              {performanceData.xpChange !== null && (
                <div
                  className={`flex items-center gap-1 mt-2 text-sm ${performanceData.xpChange >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {performanceData.xpChange >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        +{performanceData.xpChange} from previous {timeRange}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 rotate-180" />
                      <span>
                        {performanceData.xpChange} from previous {timeRange}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChartIcon className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-1">
            <LineChartIcon className="h-4 w-4" />
            <span>Trends</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            <span>Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Performance by Subject</CardTitle>
              <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                <DyslexiaFriendlyText>Your average scores across different subjects</DyslexiaFriendlyText>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    score: {
                      label: "Average Score (%)",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData.subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend />
                      <Bar dataKey="score" fill="var(--color-score)">
                        {performanceData.subjectPerformance.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={getColorByScore(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Activity Distribution</CardTitle>
                <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                  <DyslexiaFriendlyText>Breakdown of your learning activities</DyslexiaFriendlyText>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={performanceData.activityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {performanceData.activityDistribution.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              [
                                "#3b82f6", // blue-500
                                "#8b5cf6", // violet-500
                                "#ec4899", // pink-500
                                "#f97316", // orange-500
                                "#10b981", // emerald-500
                              ][index % 5]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} minutes`, "Time Spent"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Recent Activities</CardTitle>
                <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                  <DyslexiaFriendlyText>Your most recent learning activities</DyslexiaFriendlyText>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {performanceData.recentActivities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                      <div className="rounded-full p-2 bg-primary/10">
                        {activity.type === "lesson" && <BookOpen className="h-4 w-4 text-primary" />}
                        {activity.type === "quiz" && <Target className="h-4 w-4 text-primary" />}
                        {activity.type === "practice" && <Brain className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                          {activity.title}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-muted-foreground">{activity.subject}</span>
                          <span className="text-sm">
                            {activity.score !== null ? `${activity.score}%` : "Completed"}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(activity.date)}</div>
                    </div>
                  ))}

                  {performanceData.recentActivities.length === 0 && (
                    <div className="text-center py-6">
                      <p className={`text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        <DyslexiaFriendlyText>No recent activities found.</DyslexiaFriendlyText>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Performance Trends</CardTitle>
              <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                <DyslexiaFriendlyText>Your performance over time</DyslexiaFriendlyText>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    score: {
                      label: "Score (%)",
                      color: "hsl(var(--chart-1))",
                    },
                    time: {
                      label: "Study Time (min)",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData.performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, "auto"]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="score"
                        stroke="var(--color-score)"
                        activeDot={{ r: 8 }}
                      />
                      <Line yAxisId="right" type="monotone" dataKey="time" stroke="var(--color-time)" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Learning Velocity</CardTitle>
              <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                <DyslexiaFriendlyText>Your learning speed and progress over time</DyslexiaFriendlyText>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer
                  config={{
                    velocity: {
                      label: "Learning Velocity",
                      color: "hsl(var(--chart-1))",
                    },
                    xp: {
                      label: "XP Earned",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData.learningVelocity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="velocity"
                        stroke="var(--color-velocity)"
                        activeDot={{ r: 8 }}
                      />
                      <Line yAxisId="right" type="monotone" dataKey="xp" stroke="var(--color-xp)" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Weekly Activity Heatmap</CardTitle>
              <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                <DyslexiaFriendlyText>Your activity patterns throughout the week</DyslexiaFriendlyText>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-sm font-medium">
                    {day}
                  </div>
                ))}

                {performanceData.weeklyHeatmap.map((cell: any, index: number) => {
                  // Calculate color intensity based on activity level
                  const intensity = Math.min(255, Math.max(0, Math.round(255 - cell.value * 2)))
                  const backgroundColor = `rgb(${intensity}, ${intensity + 50}, 255)`

                  return (
                    <div
                      key={index}
                      className="aspect-square rounded-sm flex items-center justify-center text-xs text-white font-medium"
                      style={{ backgroundColor }}
                      title={`${cell.day}: ${cell.value} minutes`}
                    >
                      {cell.value > 0 ? cell.value : ""}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm">Less Activity</div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((level) => {
                    const intensity = Math.min(255, Math.max(0, Math.round(255 - level * 50)))
                    const backgroundColor = `rgb(${intensity}, ${intensity + 50}, 255)`

                    return <div key={level} className="w-4 h-4 rounded-sm" style={{ backgroundColor }} />
                  })}
                </div>
                <div className="text-sm">More Activity</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6 pt-6">
          {predictiveInsights ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>Learning Predictions</CardTitle>
                  <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                    <DyslexiaFriendlyText>AI-powered predictions based on your learning patterns</DyslexiaFriendlyText>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                        Projected Performance
                      </h3>
                      <div className="mt-2">
                        <ChartContainer
                          config={{
                            actual: {
                              label: "Actual Score",
                              color: "hsl(var(--chart-1))",
                            },
                            predicted: {
                              label: "Predicted Score",
                              color: "hsl(var(--chart-2))",
                            },
                          }}
                        >
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={predictiveInsights.projectedPerformance}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend />
                              <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="var(--color-actual)"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="var(--color-predicted)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h3 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                          Predicted Mastery Date
                        </h3>
                        <div className="mt-2 space-y-2">
                          {predictiveInsights.predictedMasteryDates.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{item.skill}</span>
                              <span className="font-medium">{formatDate(item.date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                          Learning Efficiency
                        </h3>
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">Current Efficiency</span>
                            <span className="text-sm font-medium">
                              {predictiveInsights.learningEfficiency.current}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-primary h-2.5 rounded-full"
                              style={{ width: `${predictiveInsights.learningEfficiency.current}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between mt-4 mb-1">
                            <span className="text-sm">Potential Efficiency</span>
                            <span className="text-sm font-medium">
                              {predictiveInsights.learningEfficiency.potential}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-green-500 h-2.5 rounded-full"
                              style={{ width: `${predictiveInsights.learningEfficiency.potential}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                    Learning Recommendations
                  </CardTitle>
                  <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                    <DyslexiaFriendlyText>Personalized recommendations to improve your learning</DyslexiaFriendlyText>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {predictiveInsights.recommendations.map((recommendation: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h3 className={`font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                          {recommendation.title}
                        </h3>
                        <p
                          className={`mt-1 text-sm text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}
                        >
                          <DyslexiaFriendlyText>{recommendation.description}</DyslexiaFriendlyText>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {recommendation.tags.map((tag: string, tagIndex: number) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {recommendation.actionUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => (window.location.href = recommendation.actionUrl)}
                          >
                            {recommendation.actionText || "Learn More"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className={`mt-4 text-lg font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                    No predictive insights available
                  </h3>
                  <p className={`text-muted-foreground ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                    <DyslexiaFriendlyText>
                      Complete more lessons and quizzes to generate predictive insights.
                    </DyslexiaFriendlyText>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

