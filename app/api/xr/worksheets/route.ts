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

    const worksheets = await db.aRWorksheet.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ worksheets })
  } catch (error) {
    console.error("Error fetching AR worksheets:", error)
    return NextResponse.json({ error: "Failed to fetch AR worksheets" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, worksheetUrl, markerImage, contentUrl, subjectId } = body

    if (!title || !worksheetUrl || !contentUrl || !subjectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const worksheet = await db.aRWorksheet.create({
      data: {
        title,
        description,
        worksheetUrl,
        markerImage,
        contentUrl,
        subjectId,
      },
    })

    return NextResponse.json({ worksheet })
  } catch (error) {
    console.error("Error creating AR worksheet:", error)
    return NextResponse.json({ error: "Failed to create AR worksheet" }, { status: 500 })
  }
}

