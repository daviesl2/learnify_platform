import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const subjectId = searchParams.get("subjectId")

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing date range parameters" }, { status: 400 })
    }

    // Parse dates
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Build query
    const whereClause: any = {
      userId: session.user.id,
      createdAt: {
        gte: start,
        lte: end,
      },
    }

    if (subjectId) {
      whereClause.subjectId = subjectId
    }

    // Fetch study sessions
    const studySessions = await db.studySession.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Transform data for the frontend
    const sessions = studySessions.map((session) => ({
      id: session.id,
      subjectId: session.subjectId,
      subjectName: session.subject.name,
      duration: session.duration,
      date: session.createdAt.toISOString().split("T")[0],
      completed: session.completed,
    }))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error fetching study sessions:", error)
    return NextResponse.json({ error: "Failed to fetch study sessions" }, { status: 500 })
  }
}

