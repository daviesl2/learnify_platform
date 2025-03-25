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

    // Get user's age group based on profile or default to middle range
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { age: true },
    })

    let ageGroup = "8-11" // Default age group

    if (user?.age) {
      if (user.age < 8) {
        ageGroup = "5-7"
      } else if (user.age >= 12) {
        ageGroup = "12-14"
      }
    }

    // Check if user has already completed a prompt today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingPrompt = await db.userMindfulnessPrompt.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        completed: true,
      },
      include: {
        prompt: true,
      },
    })

    if (existingPrompt) {
      return NextResponse.json({ prompt: existingPrompt.prompt })
    }

    // Get a random prompt for the user's age group that they haven't seen recently
    const recentPromptIds = await db.userMindfulnessPrompt.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        promptId: true,
      },
    })

    const excludeIds = recentPromptIds.map((p) => p.promptId)

    const prompts = await db.mindfulnessPrompt.findMany({
      where: {
        ageGroup,
        id: {
          notIn: excludeIds.length > 0 ? excludeIds : undefined,
        },
      },
    })

    if (prompts.length === 0) {
      // If no unseen prompts, get any prompt for the age group
      const anyPrompt = await db.mindfulnessPrompt.findFirst({
        where: {
          ageGroup,
        },
      })

      if (!anyPrompt) {
        return NextResponse.json({ error: "No mindfulness prompts available" }, { status: 404 })
      }

      // Create a user prompt record
      await db.userMindfulnessPrompt.create({
        data: {
          userId: session.user.id,
          promptId: anyPrompt.id,
        },
      })

      return NextResponse.json({ prompt: anyPrompt })
    }

    // Select a random prompt
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]

    // Create a user prompt record
    await db.userMindfulnessPrompt.create({
      data: {
        userId: session.user.id,
        promptId: randomPrompt.id,
      },
    })

    return NextResponse.json({ prompt: randomPrompt })
  } catch (error) {
    console.error("Error fetching mindfulness prompt:", error)
    return NextResponse.json({ error: "Failed to fetch mindfulness prompt" }, { status: 500 })
  }
}

