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

    // Build query for concepts
    const whereClause: any = {
      userId: session.user.id,
    }

    if (subjectId) {
      whereClause.subjectId = subjectId
    }

    // Fetch concepts
    const conceptMasteries = await db.conceptMastery.findMany({
      where: whereClause,
      include: {
        concept: {
          include: {
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Transform concept data
    const concepts = conceptMasteries.map((cm) => ({
      id: cm.conceptId,
      name: cm.concept.name,
      mastery: cm.masteryLevel,
      subjectId: cm.concept.subjectId,
      subjectName: cm.concept.subject.name,
    }))

    // Get concept IDs for connection filtering
    const conceptIds = concepts.map((c) => c.id)

    // Fetch connections between these concepts
    const conceptConnections = await db.conceptConnection.findMany({
      where: {
        OR: [
          {
            sourceConceptId: {
              in: conceptIds,
            },
            targetConceptId: {
              in: conceptIds,
            },
          },
        ],
      },
    })

    // Transform connection data
    const connections = conceptConnections.map((conn) => ({
      source: conn.sourceConceptId,
      target: conn.targetConceptId,
      strength: conn.strength,
      type: conn.connectionType,
    }))

    return NextResponse.json({ concepts, connections })
  } catch (error) {
    console.error("Error fetching knowledge graph:", error)
    return NextResponse.json({ error: "Failed to fetch knowledge graph" }, { status: 500 })
  }
}

