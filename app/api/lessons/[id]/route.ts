import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const lessonId = params.id
    const url = new URL(req.url)
    const difficultyLevel = Number.parseInt(url.searchParams.get("difficulty") || "3")

    // Fetch the lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
        subject: true,
      },
    })

    if (!lesson) {
      return NextResponse.json({ success: false, message: "Lesson not found" }, { status: 404 })
    }

    // Fetch user's progress for this lesson
    const userProgress = await prisma.lessonProgress.findFirst({
      where: {
        lessonId,
        userId: session.user.id,
      },
    })

    // Adapt content based on difficulty level
    const adaptedSteps = lesson.steps.map((step) => {
      // Base step with common properties
      const baseStep = {
        id: step.id,
        type: step.type as "concrete" | "pictorial" | "abstract",
        content: step.content,
        imageUrl: step.imageUrl,
        difficultyLevel: step.difficultyLevel as 1 | 2 | 3 | 4 | 5,
      }

      // If the step has a question, adapt it based on difficulty
      if (step.questionData) {
        const questionData = typeof step.questionData === "string" ? JSON.parse(step.questionData) : step.questionData

        // Adjust question complexity based on difficulty level
        const adaptedQuestion = questionData

        // If the difficulty level doesn't match the step's difficulty,
        // we need to adapt the question
        if (difficultyLevel !== step.difficultyLevel) {
          // For simplicity, we're just adjusting the explanation detail
          // In a real implementation, you would have more sophisticated adaptation
          if (difficultyLevel > step.difficultyLevel) {
            // Make it more challenging
            adaptedQuestion.explanation = questionData.advancedExplanation || questionData.explanation

            // Potentially add more challenging options or modify the question
            if (questionData.advancedOptions) {
              adaptedQuestion.options = questionData.advancedOptions
            }

            if (questionData.advancedText) {
              adaptedQuestion.text = questionData.advancedText
            }
          } else {
            // Make it easier
            adaptedQuestion.explanation = questionData.simpleExplanation || questionData.explanation

            // Potentially simplify options or modify the question
            if (questionData.simpleOptions) {
              adaptedQuestion.options = questionData.simpleOptions
            }

            if (questionData.simpleText) {
              adaptedQuestion.text = questionData.simpleText
            }
          }
        }

        return {
          ...baseStep,
          question: adaptedQuestion,
        }
      }

      return baseStep
    })

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        subject: lesson.subject.name,
        description: lesson.description,
      },
      steps: adaptedSteps,
      userProgress: userProgress || null,
    })
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch lesson" }, { status: 500 })
  }
}

