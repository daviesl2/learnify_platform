import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { affirmationId } = body

    if (!affirmationId) {
      return NextResponse.json({ error: "Missing affirmation ID" }, { status: 400 })
    }

    // Find the most recent user affirmation record for this affirmation
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const userAffirmation = await db.userGrowthMindsetAffirmation.findFirst({
      where: {
        userId: session.user.id,
        affirmationId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!userAffirmation) {
      return NextResponse.json({ error: "Affirmation not found" }, { status: 404 })
    }

    // Update the existing record
    const updatedAffirmation = await db.userGrowthMindsetAffirmation.update({
      where: {
        id: userAffirmation.id,
      },
      data: {
        acknowledged: true,
      },
    })

    return NextResponse.json({ success: true, userAffirmation: updatedAffirmation })
  } catch (error) {
    console.error("Error acknowledging growth mindset affirmation:", error)
    return NextResponse.json({ error: "Failed to acknowledge growth mindset affirmation" }, { status: 500 })
  }
}

