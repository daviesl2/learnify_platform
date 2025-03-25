import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { lessonId, responses, difficultyLevel, xpEarned } = await req.json()

    if (!lessonId) {
      return NextResponse.json({ success: false, message: "Lesson ID is required" }, { status: 400 })
    }

    // Calculate performance metrics
    const responseEntries = Object.entries(responses)
    const totalQuestions = responseEntries.length
    const correctAnswers = responseEntries.filter(([_, response]: [string, any]) => response.isCorrect).length
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0

    // Get or create lesson progress
    const existingProgress = await prisma.lessonProgress.findFirst({
      where: {
        lessonId,
        userId: session.user.id,
      },
    })

    if (existingProgress) {
      // Update existing progress
      await prisma.lessonProgress.update({
        where: { id: existingProgress.id },
        data: {
          completed: true,
          lastAttemptedAt: new Date(),
          attemptsCount: { increment: 1 },
          highestDifficultyCompleted: Math.max(existingProgress.highestDifficultyCompleted, difficultyLevel),
          bestAccuracy: Math.max(existingProgress.bestAccuracy, accuracy),
          responseData: JSON.stringify(responses),
        },
      })
    } else {
      // Create new progress record
      await prisma.lessonProgress.create({
        data: {
          lessonId,
          userId: session.user.id,
          completed: true,
          lastAttemptedAt: new Date(),
          attemptsCount: 1,
          highestDifficultyCompleted: difficultyLevel,
          bestAccuracy: accuracy,
          responseData: JSON.stringify(responses),
        },
      })
    }

    // Award XP to the user
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        xp: { increment: xpEarned },
      },
    })

    // Record XP transaction
    await prisma.xpTransaction.create({
      data: {
        userId: session.user.id,
        amount: xpEarned,
        source: "LESSON_COMPLETION",
        description: `Completed lesson ${lessonId} at difficulty level ${difficultyLevel}`,
      },
    })

    // Check if any achievements were unlocked
    await checkAndAwardAchievements(session.user.id, lessonId)

    return NextResponse.json({
      success: true,
      xpEarned,
      accuracy: Math.round(accuracy * 100),
    })
  } catch (error) {
    console.error("Error completing lesson:", error)
    return NextResponse.json({ success: false, message: "Failed to record lesson completion" }, { status: 500 })
  }
}

// Helper function to check and award achievements
async function checkAndAwardAchievements(userId: string, lessonId: string) {
  try {
    // Get the lesson to determine subject
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { subject: true },
    })

    if (!lesson) return

    // Get user's progress for this subject
    const subjectProgress = await prisma.lessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: {
          subjectId: lesson.subjectId,
        },
      },
    })

    // Check for subject-based achievements
    const subjectAchievements = [
      { count: 1, type: "FIRST_LESSON", name: `First ${lesson.subject.name} Lesson` },
      { count: 5, type: "FIVE_LESSONS", name: `${lesson.subject.name} Explorer` },
      { count: 10, type: "TEN_LESSONS", name: `${lesson.subject.name} Master` },
    ]

    for (const achievement of subjectAchievements) {
      if (subjectProgress === achievement.count) {
        // Check if already awarded
        const existingAchievement = await prisma.userAchievement.findFirst({
          where: {
            userId,
            achievementType: achievement.type,
            subjectId: lesson.subjectId,
          },
        })

        if (!existingAchievement) {
          // Award the achievement
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementType: achievement.type,
              name: achievement.name,
              description: `Completed ${achievement.count} ${lesson.subject.name} ${
                achievement.count === 1 ? "lesson" : "lessons"
              }`,
              subjectId: lesson.subjectId,
              xpAwarded: achievement.count * 10,
            },
          })

          // Award XP for the achievement
          await prisma.user.update({
            where: { id: userId },
            data: {
              xp: { increment: achievement.count * 10 },
            },
          })

          // Record XP transaction
          await prisma.xpTransaction.create({
            data: {
              userId,
              amount: achievement.count * 10,
              source: "ACHIEVEMENT",
              description: `Earned ${achievement.name} achievement`,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error)
  }
}

