import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get("userId") || session.user.id
    const subjectId = url.searchParams.get("subjectId") || "all"
    const timeRange = url.searchParams.get("timeRange") || "month"

    // Check if the user has permission to view this data
    if (userId !== session.user.id && !["TEACHER", "ADMIN", "PARENT"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized to view this user's data" }, { status: 403 })
    }

    // If parent, check if they are authorized to view this student's data
    if (session.user.role === "PARENT") {
      const isParentOfStudent = await prisma.parent.findFirst({
        where: {
          userId: session.user.id,
          students: {
            some: {
              userId,
            },
          },
        },
      })

      if (!isParentOfStudent) {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized to view this student's data",
          },
          { status: 403 },
        )
      }
    }

    // Calculate date range based on timeRange
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "all":
        startDate = new Date(0) // Beginning of time
        break
      default:
        startDate.setMonth(now.getMonth() - 1) // Default to month
    }

    // Fetch user's performance data
    const whereClause = {
      userId,
      createdAt: {
        gte: startDate,
      },
      ...(subjectId !== "all"
        ? {
            lesson: {
              subjectId,
            },
          }
        : {}),
    }

    // Fetch lesson progress for score calculation
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: whereClause,
      include: {
        lesson: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Fetch quiz attempts for score calculation
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: whereClause,
      include: {
        quiz: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Fetch study sessions for time calculation
    const studySessions = await prisma.studySession.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
        },
        ...(subjectId !== "all"
          ? {
              subjectId,
            }
          : {}),
      },
      orderBy: {
        startTime: "desc",
      },
    })

    // Fetch XP transactions
    const xpTransactions = await prisma.xpTransaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
        ...(subjectId !== "all"
          ? {
              subject: {
                id: subjectId,
              },
            }
          : {}),
      },
      include: {
        subject: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate average score
    const allScores = [
      ...lessonProgress.map((progress) => progress.bestAccuracy * 100),
      ...quizAttempts.map((attempt) => attempt.score),
    ]

    const averageScore = allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0

    // Calculate total study time in minutes
    const totalStudyTime = studySessions.reduce(
      (sum, session) =>
        sum +
        (session.endTime
          ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
          : 0),
      0,
    )

    // Calculate total XP earned
    const totalXP = xpTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

    // Calculate performance by subject
    const subjectPerformance: any[] = []
    const subjectMap = new Map<string, { scores: number[]; name: string; id: string }>()

    // Process lesson progress
    lessonProgress.forEach((progress) => {
      const subjectId = progress.lesson.subjectId
      const subjectName = progress.lesson.subject.name

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, { scores: [], name: subjectName, id: subjectId })
      }

      subjectMap.get(subjectId)?.scores.push(progress.bestAccuracy * 100)
    })

    // Process quiz attempts
    quizAttempts.forEach((attempt) => {
      const subjectId = attempt.quiz.subjectId
      const subjectName = attempt.quiz.subject.name

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, { scores: [], name: subjectName, id: subjectId })
      }

      subjectMap.get(subjectId)?.scores.push(attempt.score)
    })

    // Calculate average score for each subject
    subjectMap.forEach((data, subjectId) => {
      const averageSubjectScore =
        data.scores.length > 0 ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length : 0

      subjectPerformance.push({
        id: subjectId,
        name: data.name,
        score: Math.round(averageSubjectScore),
      })
    })

    // Sort by score descending
    subjectPerformance.sort((a, b) => b.score - a.score)

    // Calculate activity distribution
    const activityDistribution = [
      {
        name: "Lessons",
        value: lessonProgress.length,
      },
      {
        name: "Quizzes",
        value: quizAttempts.length,
      },
      {
        name: "Practice",
        value: studySessions.filter((session) => session.type === "PRACTICE").length,
      },
      {
        name: "Review",
        value: studySessions.filter((session) => session.type === "REVIEW").length,
      },
      {
        name: "Other",
        value: studySessions.filter((session) => session.type !== "PRACTICE" && session.type !== "REVIEW").length,
      },
    ]

    // Filter out zero values
    const filteredActivityDistribution = activityDistribution.filter((item) => item.value > 0)

    // Get recent activities
    const recentActivities = [
      ...lessonProgress.map((progress) => ({
        id: progress.id,
        title: progress.lesson.title,
        type: "lesson",
        subject: progress.lesson.subject.name,
        score: progress.bestAccuracy * 100,
        date: progress.lastAttemptedAt.toISOString(),
      })),
      ...quizAttempts.map((attempt) => ({
        id: attempt.id,
        title: attempt.quiz.title,
        type: "quiz",
        subject: attempt.quiz.subject.name,
        score: attempt.score,
        date: attempt.createdAt.toISOString(),
      })),
      ...studySessions.map((session) => ({
        id: session.id,
        title: session.title || `${session.type} Session`,
        type: session.type.toLowerCase(),
        subject: session.subject?.name || "Unknown",
        score: null,
        date: session.startTime.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    // Calculate performance trend
    const performanceTrend: any[] = []
    const dateMap = new Map<string, { scores: number[]; time: number }>()

    // Process lesson progress for trend
    lessonProgress.forEach((progress) => {
      const date = progress.lastAttemptedAt.toISOString().split("T")[0]

      if (!dateMap.has(date)) {
        dateMap.set(date, { scores: [], time: 0 })
      }

      dateMap.get(date)?.scores.push(progress.bestAccuracy * 100)
    })

    // Process quiz attempts for trend
    quizAttempts.forEach((attempt) => {
      const date = attempt.createdAt.toISOString().split("T")[0]

      if (!dateMap.has(date)) {
        dateMap.set(date, { scores: [], time: 0 })
      }

      dateMap.get(date)?.scores.push(attempt.score)
    })

    // Process study sessions for trend
    studySessions.forEach((session) => {
      const date = session.startTime.toISOString().split("T")[0]

      if (!dateMap.has(date)) {
        dateMap.set(date, { scores: [], time: 0 })
      }

      const sessionTime = session.endTime
        ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
        : 0

      dateMap.get(date)!.time += sessionTime
    })

    // Calculate average score for each date
    dateMap.forEach((data, date) => {
      const averageDailyScore =
        data.scores.length > 0 ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length : 0

      performanceTrend.push({
        date,
        score: Math.round(averageDailyScore),
        time: data.time,
      })
    })

    // Sort by date ascending
    performanceTrend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate learning velocity
    const learningVelocity = performanceTrend.map((day, index, array) => {
      let velocity = 0

      if (index > 0) {
        // Calculate rate of change in score
        velocity = day.score - array[index - 1].score
      }

      // Get XP for this day
      const dayXP = xpTransactions
        .filter((transaction) => transaction.createdAt.toISOString().split("T")[0] === day.date)
        .reduce((sum, transaction) => sum + transaction.amount, 0)

      return {
        date: day.date,
        velocity,
        xp: dayXP,
      }
    })

    // Generate weekly heatmap
    const weeklyHeatmap: any[] = []
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    // Initialize with zeros
    for (let i = 0; i < 7; i++) {
      weeklyHeatmap.push({
        day: daysOfWeek[i],
        value: 0,
      })
    }

    // Fill in actual values
    studySessions.forEach((session) => {
      const dayOfWeek = new Date(session.startTime).getDay()
      const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to 0-6 where 0 is Monday

      const sessionTime = session.endTime
        ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
        : 0

      weeklyHeatmap[adjustedDayIndex].value += sessionTime
    })

    // Calculate changes from previous period
    let scoreChange = null
    let studyTimeChange = null
    let xpChange = null

    if (timeRange !== "all") {
      // Calculate previous period
      const previousEndDate = new Date(startDate)
      const previousStartDate = new Date(startDate)

      switch (timeRange) {
        case "week":
          previousStartDate.setDate(previousStartDate.getDate() - 7)
          break
        case "month":
          previousStartDate.setMonth(previousStartDate.getMonth() - 1)
          break
        case "year":
          previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
          break
      }

      // Fetch previous period data
      const previousLessonProgress = await prisma.lessonProgress.findMany({
        where: {
          userId,
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
          ...(subjectId !== "all"
            ? {
                lesson: {
                  subjectId,
                },
              }
            : {}),
        },
      })

      const previousQuizAttempts = await prisma.quizAttempt.findMany({
        where: {
          userId,
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
          ...(subjectId !== "all"
            ? {
                quiz: {
                  subjectId,
                },
              }
            : {}),
        },
      })

      const previousStudySessions = await prisma.studySession.findMany({
        where: {
          userId,
          startTime: {
            gte: previousStartDate,
            lt: startDate,
          },
          ...(subjectId !== "all"
            ? {
                subjectId,
              }
            : {}),
        },
      })

      const previousXpTransactions = await prisma.xpTransaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
          ...(subjectId !== "all"
            ? {
                subject: {
                  id: subjectId,
                },
              }
            : {}),
        },
      })

      // Calculate previous period metrics
      const previousScores = [
        ...previousLessonProgress.map((progress) => progress.bestAccuracy * 100),
        ...previousQuizAttempts.map((attempt) => attempt.score),
      ]

      const previousAverageScore =
        previousScores.length > 0 ? previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length : 0

      const previousTotalStudyTime = previousStudySessions.reduce(
        (sum, session) =>
          sum +
          (session.endTime
            ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
            : 0),
        0,
      )

      const previousTotalXP = previousXpTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

      // Calculate changes
      scoreChange = averageScore - previousAverageScore
      studyTimeChange = totalStudyTime - previousTotalStudyTime
      xpChange = totalXP - previousTotalXP
    }

    // Generate predictive insights if there's enough data
    let predictiveInsights = null

    if (lessonProgress.length > 5 || quizAttempts.length > 5 || studySessions.length > 5) {
      predictiveInsights = await generatePredictiveInsights(
        userId,
        subjectId,
        lessonProgress,
        quizAttempts,
        studySessions,
        xpTransactions,
      )
    }

    return NextResponse.json({
      success: true,
      performance: {
        averageScore: Math.round(averageScore),
        totalStudyTime,
        totalXP,
        scoreChange,
        studyTimeChange,
        xpChange,
        subjectPerformance,
        activityDistribution: filteredActivityDistribution,
        recentActivities,
        performanceTrend,
        learningVelocity,
        weeklyHeatmap,
      },
      predictiveInsights,
    })
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch performance data" }, { status: 500 })
  }
}

async function generatePredictiveInsights(
  userId: string,
  subjectId: string,
  lessonProgress: any[],
  quizAttempts: any[],
  studySessions: any[],
  xpTransactions: any[],
) {
  try {
    // Generate projected performance
    const performanceData = [...lessonProgress, ...quizAttempts]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((item) => {
        const date = new Date(item.createdAt).toISOString().split("T")[0]
        const score = "score" in item ? item.score : item.bestAccuracy * 100
        return { date, score }
      })

    // Group by date and average scores
    const dateScoreMap = new Map<string, number[]>()

    performanceData.forEach((item) => {
      if (!dateScoreMap.has(item.date)) {
        dateScoreMap.set(item.date, [])
      }
      dateScoreMap.get(item.date)?.push(item.score)
    })

    const averagedPerformance: { date: string; score: number }
    ;[] = []

    dateScoreMap.forEach((scores, date) => {
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
      averagedPerformance.push({ date, score: Math.round(averageScore) })
    })

    // Sort by date
    averagedPerformance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Generate future dates for prediction
    const lastDate =
      averagedPerformance.length > 0 ? new Date(averagedPerformance[averagedPerformance.length - 1].date) : new Date()

    const futureDates: string[] = []

    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      futureDates.push(futureDate.toISOString().split("T")[0])
    }

    // Simple linear regression for prediction
    // This is a simplified approach - in a real app, you'd use more sophisticated models
    const projectedPerformance = [...averagedPerformance]

    if (averagedPerformance.length >= 3) {
      // Calculate trend based on last 3 points
      const last3Points = averagedPerformance.slice(-3)
      const slope =
        (last3Points[2].score - last3Points[0].score) /
        (new Date(last3Points[2].date).getTime() - new Date(last3Points[0].date).getTime())

      // Project future scores
      futureDates.forEach((date, index) => {
        const daysDiff = (new Date(date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)

        const predictedScore = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              averagedPerformance[averagedPerformance.length - 1].score + slope * daysDiff * 1000 * 60 * 60 * 24,
            ),
          ),
        )

        projectedPerformance.push({
          date,
          score: null,
          predicted: predictedScore,
        })
      })
    }

    // Format for chart display
    const formattedProjectedPerformance = projectedPerformance.map((item) => ({
      date: item.date,
      actual: item.score || null,
      predicted: item.predicted || null,
    }))

    // Generate predicted mastery dates
    // This is a simplified approach
    const predictedMasteryDates = [
      {
        skill: "Addition & Subtraction",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        skill: "Multiplication",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        skill: "Division",
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    // Calculate learning efficiency
    const learningEfficiency = {
      current: 65, // Placeholder
      potential: 85, // Placeholder
    }

    // Generate recommendations using AI
    const recommendations = await generateRecommendations(
      userId,
      subjectId,
      lessonProgress,
      quizAttempts,
      studySessions,
    )

    return {
      projectedPerformance: formattedProjectedPerformance,
      predictedMasteryDates,
      learningEfficiency,
      recommendations,
    }
  } catch (error) {
    console.error("Error generating predictive insights:", error)
    return null
  }
}

async function generateRecommendations(
  userId: string,
  subjectId: string,
  lessonProgress: any[],
  quizAttempts: any[],
  studySessions: any[],
) {
  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
      },
    })

    if (!user) return []

    // Get subject name
    let subjectName = "all subjects"

    if (subjectId !== "all") {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      })

      if (subject) {
        subjectName = subject.name
      }
    }

    // Prepare data for AI
    const performanceData = {
      lessonProgress: lessonProgress.map((progress) => ({
        lessonTitle: progress.lesson.title,
        subject: progress.lesson.subject.name,
        accuracy: progress.bestAccuracy,
        attempts: progress.attemptsCount,
        completed: progress.completed,
        date: progress.lastAttemptedAt,
      })),
      quizAttempts: quizAttempts.map((attempt) => ({
        quizTitle: attempt.quiz.title,
        subject: attempt.quiz.subject.name,
        score: attempt.score,
        date: attempt.createdAt,
      })),
      studySessions: studySessions.map((session) => ({
        title: session.title,
        type: session.type,
        subject: session.subject?.name,
        duration: session.endTime
          ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
          : 0,
        date: session.startTime,
      })),
    }

    // Generate recommendations using AI
    const prompt = `You are an expert educational AI that analyzes student performance data and provides personalized learning recommendations.

USER INFORMATION:
Name: ${user.name || "Student"}
Grade Level: ${user.student?.gradeLevel || "Unknown"}
Subject: ${subjectName}

PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

Based on this data, provide 3 personalized learning recommendations in the following JSON format:
[
  {
    "title": "Recommendation title",
    "description": "Detailed description of the recommendation",
    "tags": ["tag1", "tag2"],
    "actionText": "Button text",
    "actionUrl": "/recommended/path"
  },
  ...
]

Ensure your recommendations are specific, actionable, and based on educational best practices.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    // Parse the JSON response
    try {
      const recommendations = JSON.parse(text)
      return recommendations
    } catch (error) {
      console.error("Error parsing AI recommendations:", error)

      // Fallback recommendations
      return [
        {
          title: "Practice Regularly",
          description: "Set aside 20 minutes each day for focused practice on challenging topics.",
          tags: ["Study Habits", "Time Management"],
          actionText: "Create Study Schedule",
          actionUrl: "/dashboard/schedule",
        },
        {
          title: "Review Past Mistakes",
          description: "Analyze your previous quiz attempts to identify and address knowledge gaps.",
          tags: ["Review", "Self-Assessment"],
          actionText: "View Quiz History",
          actionUrl: "/dashboard/quizzes",
        },
        {
          title: "Try Different Learning Methods",
          description:
            "Experiment with visual, auditory, and kinesthetic learning approaches to find what works best for you.",
          tags: ["Learning Styles", "Study Techniques"],
          actionText: "Explore Learning Styles",
          actionUrl: "/dashboard/learning-styles",
        },
      ]
    }
  } catch (error) {
    console.error("Error generating recommendations:", error)
    return []
  }
}

