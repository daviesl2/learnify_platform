import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

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

    // Check if the user has permission to export this data
    if (userId !== session.user.id && !["TEACHER", "ADMIN", "PARENT"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized to export this user's data" }, { status: 403 })
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
            message: "Unauthorized to export this student's data",
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

    // Fetch lesson progress
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

    // Fetch quiz attempts
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

    // Fetch study sessions
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
      include: {
        subject: true,
      },
      orderBy: {
        startTime: "desc",
      },
    })

    // Generate CSV data
    let csvContent = "Date,Activity Type,Title,Subject,Score,Duration (minutes)\n"

    // Add lesson progress to CSV
    lessonProgress.forEach((progress) => {
      csvContent += `${progress.lastAttemptedAt.toISOString()},Lesson,${
        progress.lesson.title
      },${progress.lesson.subject.name},${progress.bestAccuracy * 100},${progress.timeSpentMinutes || 0}\n`
    })

    // Add quiz attempts to CSV
    quizAttempts.forEach((attempt) => {
      csvContent += `${attempt.createdAt.toISOString()},Quiz,${
        attempt.quiz.title
      },${attempt.quiz.subject.name},${attempt.score},${attempt.timeSpentMinutes || 0}\n`
    })

    // Add study sessions to CSV
    studySessions.forEach((session) => {
      const duration = session.endTime
        ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
        : 0

      csvContent += `${session.startTime.toISOString()},${session.type},${session.title || "Study Session"},${
        session.subject?.name || "Unknown"
      },,${duration}\n`
    })

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="performance_data_${timeRange}_${subjectId}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ success: false, message: "Failed to export data" }, { status: 500 })
  }
}

