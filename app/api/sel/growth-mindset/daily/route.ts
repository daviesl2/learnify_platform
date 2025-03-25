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

    // Check if user has already seen an affirmation today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingAffirmation = await db.userGrowthMindsetAffirmation.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        affirmation: true,
      },
    })

    if (existingAffirmation) {
      return NextResponse.json({ affirmation: existingAffirmation.affirmation })
    }

    // Get a random affirmation for the user's age group that they haven't seen recently
    const recentAffirmationIds = await db.userGrowthMindsetAffirmation.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        affirmationId: true,
      },
    })

    const excludeIds = recentAffirmationIds.map((a) => a.affirmationId)

    const affirmations = await db.growthMindsetAffirmation.findMany({
      where: {
        ageGroup,
        id: {
          notIn: excludeIds.length > 0 ? excludeIds : undefined,
        },
      },
    })

    if (affirmations.length === 0) {
      // If no unseen affirmations, get any affirmation for the age group
      const anyAffirmation = await db.growthMindsetAffirmation.findFirst({
        where: {
          ageGroup,
        },
      })

      if (!anyAffirmation) {
        return NextResponse.json({ error: "No growth mindset affirmations available" }, { status: 404 })
      }

      // Create a user affirmation record
      await db.userGrowthMindsetAffirmation.create({
        data: {
          userId: session.user.id,
          affirmationId: anyAffirmation.id,
          seen: true,
        },
      })

      return NextResponse.json({ affirmation: anyAffirmation })
    }

    // Select a random affirmation
    const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)]

    // Create a user affirmation record
    await db.userGrowthMindsetAffirmation.create({
      data: {
        userId: session.user.id,
        affirmationId: randomAffirmation.id,
        seen: true,
      },
    })

    return NextResponse.json({ affirmation: randomAffirmation })
  } catch (error) {
    console.error("Error fetching growth mindset affirmation:", error)
    return NextResponse.json({ error: "Failed to fetch growth mindset affirmation" }, { status: 500 })
  }
}

