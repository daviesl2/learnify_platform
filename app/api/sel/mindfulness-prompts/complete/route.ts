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
    const { promptId, response } = body

    if (!promptId || !response) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find the most recent user prompt record for this prompt
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const userPrompt = await db.userMindfulnessPrompt.findFirst({
      where: {
        userId: session.user.id,
        promptId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!userPrompt) {
      // If no record exists, create a new one
      const completedPrompt = await db.userMindfulnessPrompt.create({
        data: {
          userId: session.user.id,
          promptId,
          response,
          completed: true,
        },
      })

      return NextResponse.json({ success: true, userPrompt: completedPrompt })
    }

    // Update the existing record
    const updatedPrompt = await db.userMindfulnessPrompt.update({
      where: {
        id: userPrompt.id,
      },
      data: {
        response,
        completed: true,
      },
    })

    return NextResponse.json({ success: true, userPrompt: updatedPrompt })
  } catch (error) {
    console.error("Error completing mindfulness prompt:", error)
    return NextResponse.json({ error: "Failed to complete mindfulness prompt" }, { status: 500 })
  }
}

