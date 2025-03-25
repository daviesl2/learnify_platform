import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const subjectId = url.searchParams.get("subjectId")
    const topic = url.searchParams.get("topic")

    if (!subjectId) {
      return NextResponse.json({ success: false, message: "Subject ID is required" }, { status: 400 })
    }

    // Fetch diagnostic questions for the subject and topic
    const questions = await prisma.diagnosticQuestion.findMany({
      where: {
        subjectId,
        ...(topic ? { topic: { contains: topic } } : {}),
      },
      orderBy: {
        difficulty: "asc",
      },
      take: 10, // Limit to 10 questions for the diagnostic
    })

    // If no specific questions for this topic, get general subject questions
    if (questions.length === 0 && topic) {
      const generalQuestions = await prisma.diagnosticQuestion.findMany({
        where: {
          subjectId,
          topic: null,
        },
        orderBy: {
          difficulty: "asc",
        },
        take: 10,
      })

      return NextResponse.json({
        success: true,
        questions: generalQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          difficulty: q.difficulty,
          skill: q.skill,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options as string[],
        difficulty: q.difficulty,
        skill: q.skill,
      })),
    })
  } catch (error) {
    console.error("Error fetching diagnostic questions:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch diagnostic questions" }, { status: 500 })
  }
}

