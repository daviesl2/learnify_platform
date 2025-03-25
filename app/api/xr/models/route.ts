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
    const category = searchParams.get("category")

    const whereClause: any = {}

    if (subjectId) {
      whereClause.subjectId = subjectId
    }

    if (category) {
      whereClause.category = category
    }

    const models = await db.xRModel.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ models })
  } catch (error) {
    console.error("Error fetching XR models:", error)
    return NextResponse.json({ error: "Failed to fetch XR models" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, modelUrl, thumbnailUrl, category, subjectId } = body

    if (!name || !modelUrl || !category || !subjectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const model = await db.xRModel.create({
      data: {
        name,
        description,
        modelUrl,
        thumbnailUrl,
        category,
        subjectId,
      },
    })

    return NextResponse.json({ model })
  } catch (error) {
    console.error("Error creating XR model:", error)
    return NextResponse.json({ error: "Failed to create XR model" }, { status: 500 })
  }
}

