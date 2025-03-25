"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns"
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from "recharts"
import { ChevronLeft, ChevronRight, CalendarIcon, BarChartIcon, Download } from "lucide-react"

interface StudySession {
  id: string
  subjectId: string
  subjectName: string
  duration: number // in minutes
  date: string
  completed: boolean
}

interface Subject {
  id: string
  name: string
  color: string
}

interface LearningVelocityVisualizerProps {
  userId: string
  initialSessions?: StudySession[]
  subjects?: Subject[]
}

export function LearningVelocityVisualizer({
  userId,
  initialSessions = [],
  subjects = [],
}: LearningVelocityVisualizerProps) {
  const [activeTab, setActiveTab] = useState("weekly")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessions, setSessions] = useState<StudySession[]>(initialSessions)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch study sessions when parameters change
  useEffect(() => {
    fetchStudySessions()
  }, [activeTab, selectedSubject, currentDate])

  const fetchStudySessions = async () => {
    setIsLoading(true)

    try {
      let startDate, endDate

      if (activeTab === "weekly") {
        startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
        endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
      } else {
        startDate = format(startOfMonth(currentDate), "yyyy-MM-dd")
        endDate = format(endOfMonth(currentDate), "yyyy-MM-dd")
      }

      const url = `/api/analytics/study-sessions?startDate=${startDate}&endDate=${endDate}${selectedSubject ? `&subjectId=${selectedSubject}` : ""}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.sessions) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error("Error fetching study sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const navigatePrevious = () => {
    if (activeTab === "weekly") {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }

  const navigateNext = () => {
    if (activeTab === "weekly") {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const getDateRangeText = () => {
    if (activeTab === "weekly") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
    } else {
      return format(currentDate, "MMMM yyyy")
    }
  }

  const prepareWeeklyData = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      const daySessions = sessions.filter((session) => session.date.startsWith(dayStr))

      const totalMinutes = daySessions.reduce((sum, session) => sum + session.duration, 0)

      return {
        date: format(day, "EEE"),
        fullDate: dayStr,
        minutes: totalMinutes,
        sessions: daySessions,
      }
    })
  }

  const prepareMonthlyData = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start, end })

    // Group by week
    const weeks: { [key: string]: any } = {}

    days.forEach((day) => {
      const weekStart = format(startOfWeek(day, { weekStartsOn: 1 }), "yyyy-MM-dd")
      const dayStr = format(day, "yyyy-MM-dd")
      const daySessions = sessions.filter((session) => session.date.startsWith(dayStr))

      if (!weeks[weekStart]) {
        weeks[weekStart] = {
          weekStart,
          weekLabel: `${format(startOfWeek(day, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(day, { weekStartsOn: 1 }), "MMM d")}`,
          minutes: 0,
          sessions: [],
        }
      }

      weeks[weekStart].minutes += daySessions.reduce((sum, session) => sum + session.duration, 0)
      weeks[weekStart].sessions = [...weeks[weekStart].sessions, ...daySessions]
    })

    return Object.values(weeks)
  }

  const getChartData = () => {
    return activeTab === "weekly" ? prepareWeeklyData() : prepareMonthlyData()
  }

  const getIntensityColor = (minutes: number) => {
    if (minutes === 0) return "hsl(var(--muted))"
    if (minutes < 30) return "hsl(var(--chart-1))"
    if (minutes < 60) return "hsl(var(--chart-2))"
    if (minutes < 90) return "hsl(var(--chart-3))"
    return "hsl(var(--chart-4))"
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) {
      return `${mins}m`
    } else if (mins === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${mins}m`
    }
  }

  const exportData = () => {
    const data = getChartData()
    const csvContent = [
      ["Date", "Study Time (minutes)", "Subjects"].join(","),
      ...data.map((d) => {
        const subjectCounts = d.sessions.reduce((acc, session) => {
          acc[session.subjectName] = (acc[session.subjectName] || 0) + session.duration
          return acc
        }, {})

        const subjectsStr = Object.entries(subjectCounts)
          .map(([subject, minutes]) => `${subject}: ${minutes}m`)
          .join("; ")

        return [d.fullDate || d.weekStart, d.minutes, subjectsStr].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `study-time-${getDateRangeText().replace(/\s/g, "-")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Learning Velocity</CardTitle>
            <CardDescription>Track your study frequency and intensity</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedSubject || ""} onValueChange={(value) => setSelectedSubject(value || null)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Subjects" />
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

            <Button variant="outline" size="icon" onClick={exportData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <BarChartIcon className="h-4 w-4 mr-2" />
              Monthly
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="font-medium">{getDateRangeText()}</span>
              <Button variant="ghost" size="sm" onClick={navigateToday}>
                Today
              </Button>
            </div>

            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-[300px] w-full">
            <ChartContainer
              config={{
                minutes: {
                  label: "Study Time",
                  color: "hsl(var(--chart-1))",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={activeTab === "weekly" ? "date" : "weekLabel"} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${value}m`} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="minutes" name="Study Time" radius={[4, 4, 0, 0]}>
                    {getChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getIntensityColor(entry.minutes)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1">
            <div className="text-center">
              <div className="h-4 w-full bg-muted rounded-sm"></div>
              <span className="text-xs text-muted-foreground">0m</span>
            </div>
            <div className="text-center">
              <div className="h-4 w-full" style={{ backgroundColor: "hsl(var(--chart-1))" }}></div>
              <span className="text-xs text-muted-foreground">&lt;30m</span>
            </div>
            <div className="text-center">
              <div className="h-4 w-full" style={{ backgroundColor: "hsl(var(--chart-2))" }}></div>
              <span className="text-xs text-muted-foreground">30-60m</span>
            </div>
            <div className="text-center">
              <div className="h-4 w-full" style={{ backgroundColor: "hsl(var(--chart-3))" }}></div>
              <span className="text-xs text-muted-foreground">60-90m</span>
            </div>
            <div className="text-center">
              <div className="h-4 w-full" style={{ backgroundColor: "hsl(var(--chart-4))" }}></div>
              <span className="text-xs text-muted-foreground">&gt;90m</span>
            </div>
          </div>
        </CardContent>

        <TabsContent value="weekly">
          <CardFooter className="flex flex-col">
            <div className="w-full">
              <h3 className="text-sm font-medium mb-2">Daily Breakdown</h3>
              <div className="space-y-2">
                {prepareWeeklyData().map((day) => (
                  <div key={day.fullDate} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-12 rounded-sm mr-3"
                        style={{ backgroundColor: getIntensityColor(day.minutes) }}
                      ></div>
                      <div>
                        <p className="font-medium">{format(new Date(day.fullDate), "EEEE")}</p>
                        <p className="text-sm text-muted-foreground">{day.fullDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatMinutes(day.minutes)}</p>
                      <p className="text-sm text-muted-foreground">
                        {day.sessions.length} {day.sessions.length === 1 ? "session" : "sessions"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardFooter>
        </TabsContent>

        <TabsContent value="monthly">
          <CardFooter className="flex flex-col">
            <div className="w-full">
              <h3 className="text-sm font-medium mb-2">Weekly Breakdown</h3>
              <div className="space-y-2">
                {prepareMonthlyData().map((week) => (
                  <div key={week.weekStart} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-12 rounded-sm mr-3"
                        style={{ backgroundColor: getIntensityColor(week.minutes) }}
                      ></div>
                      <div>
                        <p className="font-medium">{week.weekLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          Week of {format(new Date(week.weekStart), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatMinutes(week.minutes)}</p>
                      <p className="text-sm text-muted-foreground">
                        {week.sessions.length} {week.sessions.length === 1 ? "session" : "sessions"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardFooter>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

