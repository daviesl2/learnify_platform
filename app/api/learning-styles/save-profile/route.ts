import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { visual, auditory, reading, kinesthetic, dominantStyle } = data

    // Validate the data
    if (
      typeof visual !== "number" ||
      typeof auditory !== "number" ||
      typeof reading !== "number" ||
      typeof kinesthetic !== "number" ||
      !["visual", "auditory", "reading", "kinesthetic"].includes(dominantStyle)
    ) {
      return NextResponse.json({ error: "Invalid learning style data" }, { status: 400 })
    }

    // Check if a profile already exists for this user
    const existingProfile = await db.learningStyleProfile.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (existingProfile) {
      // Update existing profile
      const updatedProfile = await db.learningStyleProfile.update({
        where: {
          userId: session.user.id,
        },
        data: {
          visual,
          auditory,
          reading,
          kinesthetic,
          dominantStyle,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        message: "Learning style profile updated successfully",
        profile: updatedProfile,
      })
    } else {
      // Create new profile
      const newProfile = await db.learningStyleProfile.create({
        data: {
          userId: session.user.id,
          visual,
          auditory,
          reading,
          kinesthetic,
          dominantStyle,
        },
      })

      return NextResponse.json({
        message: "Learning style profile created successfully",
        profile: newProfile,
      })
    }
  } catch (error) {
    console.error("Error saving learning style profile:", error)
    return NextResponse.json({ error: "Failed to save learning style profile" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await db.learningStyleProfile.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (!profile) {
      return NextResponse.json({ message: "No learning style profile found for this user" }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error fetching learning style profile:", error)
    return NextResponse.json({ error: "Failed to fetch learning style profile" }, { status: 500 })
  }
}

