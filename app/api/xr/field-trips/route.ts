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
    const subjectId = searchParams.get("subjectId")

    const whereClause: any = {}

    if (subjectId) {
      whereClause.subjectId = subjectId
    }

    const fieldTrips = await db.virtualFieldTrip.findMany({
      where: whereClause,
      include: {
        model: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ fieldTrips })
  } catch (error) {
    console.error("Error fetching field trips:", error)
    return NextResponse.json({ error: "Failed to fetch field trips" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, panoramaUrl, hotspots, modelId, subjectId } = body

    if (!title || !panoramaUrl || !subjectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const fieldTrip = await db.virtualFieldTrip.create({
      data: {
        title,
        description,
        panoramaUrl,
        hotspots,
        modelId,
        subjectId,
      },
    })

    return NextResponse.json({ fieldTrip })
  } catch (error) {
    console.error("Error creating field trip:", error)
    return NextResponse.json({ error: "Failed to create field trip" }, { status: 500 })
  }
}

