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
    const date = searchParams.get("date")

    // If date is provided, filter entries by date
    const whereClause: any = {
      userId: session.user.id,
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    const entries = await db.moodEntry.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error fetching mood entries:", error)
    return NextResponse.json({ error: "Failed to fetch mood entries" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { mood, intensity, notes } = body

    if (!mood || !intensity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const entry = await db.moodEntry.create({
      data: {
        userId: session.user.id,
        mood,
        intensity,
        notes,
      },
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error("Error creating mood entry:", error)
    return NextResponse.json({ error: "Failed to create mood entry" }, { status: 500 })
  }
}

