import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { subjectId, topic, responses } = await req.json()

    if (!subjectId || !responses) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // Fetch the questions to evaluate responses
    const questionIds = Object.keys(responses)
    const questions = await prisma.diagnosticQuestion.findMany({
      where: {
        id: {
          in: questionIds,
        },
      },
    })

    // Evaluate responses
    const evaluations = questions.map((question) => {
      const userResponse = responses[question.id]
      const correctAnswer = question.correctAnswer
      const isCorrect = userResponse === correctAnswer

      return {
        questionId: question.id,
        userResponse,
        correctAnswer,
        isCorrect,
        skill: question.skill,
        difficulty: question.difficulty,
      }
    })

    // Calculate skill proficiencies
    const skillProficiencies: Record<string, { correct: number; total: number }> = {}

    evaluations.forEach((eval) => {
      if (!skillProficiencies[eval.skill]) {
        skillProficiencies[eval.skill] = { correct: 0, total: 0 }
      }
      
      skillProficiencies[eval.skill].total += 1
      if (eval.isCorrect) {
        skillProficiencies[eval.skill].correct += 1
      }
    })

    // Calculate overall proficiency
    const totalCorrect = evaluations.filter((e) => e.isCorrect).length
    const overallProficiency = (totalCorrect / evaluations.length) * 100

    // Determine mastered and in-progress skills
    const masteredSkills: string[] = []
    const inProgressSkills: string[] = []

    Object.entries(skillProficiencies).forEach(([skill, { correct, total }]) => {
      const proficiency = (correct / total) * 100
      if (proficiency >= 80) {
        masteredSkills.push(skill)
      } else if (proficiency > 0) {
        inProgressSkills.push(skill)
      }
    })

    // Save diagnostic results
    await prisma.diagnosticResult.create({
      data: {
        userId: session.user.id,
        subjectId,
        topic: topic || null,
        responses: JSON.stringify(responses),
        evaluations: JSON.stringify(evaluations),
        overallProficiency,
        masteredSkills,
        inProgressSkills,
      },
    })

    // Update user's learning path based on diagnostic results
    const learningPath = await prisma.learningPath.findFirst({
      where: {
        subjectId,
        ...(topic ? { topic: { contains: topic } } : {}),
      },
      include: {
        nodes: {
          orderBy: {
            order: "asc",
          },
        },
      },
    })

    if (learningPath) {
      // Find or create user progress for this learning path
      let userProgress = await prisma.userLearningPathProgress.findFirst({
        where: {
          userId: session.user.id,
          learningPathId: learningPath.id,
        },
      })

      if (!userProgress) {
        userProgress = await prisma.userLearningPathProgress.create({
          data: {
            userId: session.user.id,
            learningPathId: learningPath.id,
            currentNodeId: learningPath.nodes[0]?.id, // Start with the first node
            completedNodeIds: [],
            masteredSkills,
            inProgressSkills,
            overallProgress: 0,
          },
        })
      } else {
        // Update existing progress with diagnostic results
        userProgress = await prisma.userLearningPathProgress.update({
          where: { id: userProgress.id },
          data: {
            masteredSkills,
            inProgressSkills,
          },
        })
      }

      // Generate personalized learning insights using AI
      const learningInsights = await generateLearningInsights(
        evaluations,
        skillProficiencies,
        overallProficiency,
        subjectId,
        topic,
      )

      // Return the updated learning path with user progress
      const updatedLearningPath = {
        ...learningPath,
        userProgress: {
          currentNodeId: userProgress.currentNodeId,
          completedNodeIds: userProgress.completedNodeIds,
          masteredSkills: userProgress.masteredSkills,
          inProgressSkills: userProgress.inProgressSkills,
          overallProgress: userProgress.overallProgress,
        },
      }

      return NextResponse.json({
        success: true,
        diagnosticResults: {
          overallProficiency,
          masteredSkills,
          inProgressSkills,
          evaluations,
        },
        updatedLearningPath,
        learningInsights,
      })
    }

    return NextResponse.json({
      success: true,
      diagnosticResults: {
        overallProficiency,
        masteredSkills,
        inProgressSkills,
        evaluations,
      },
    })
  } catch (error) {
    console.error("Error submitting diagnostic:", error)
    return NextResponse.json({ success: false, message: "Failed to submit diagnostic" }, { status: 500 })
  }
}

async function generateLearningInsights(
  evaluations: any[],
  skillProficiencies: Record<string, { correct: number; total: number }>,
  overallProficiency: number,
  subjectId: string,
  topic?: string | null,
) {
  try {
    // Get subject name
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true },
    })

    const subjectName = subject?.name || "this subject"

    // Build prompt for AI
    const prompt = `You are an expert educational AI that analyzes student diagnostic results and provides personalized learning insights.

DIAGNOSTIC RESULTS:
Overall Proficiency: ${overallProficiency.toFixed(2)}%
Subject: ${subjectName}
${topic ? `Topic: ${topic}` : ""}

Skill Proficiencies:
${Object.entries(skillProficiencies)
  .map(
    ([skill, { correct, total }]) =>
      `- ${skill}: ${((correct / total) * 100).toFixed(2)}% (${correct}/${total})`
  )
  .join("\n")}

Question Evaluations:
${evaluations
  .map(
    (eval) =>
      `- Question on ${eval.skill} (Difficulty: ${eval.difficulty}/5): ${
        eval.isCorrect ? "Correct" : "Incorrect"
      }`
  )
  .join("\n")}

Based on these results, provide personalized learning insights in the following JSON format:
{
  "strengths": ["Strength 1", "Strength 2", ...],
  "areasForGrowth": ["Area 1", "Area 2", ...],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed description",
      "actionText": "Button text",
      "actionUrl": "/recommended/path"
    },
    ...
  ],
  "learningStyle": {
    "primary": "Visual/Auditory/Kinesthetic/Reading-Writing",
    "primaryPercentage": 65,
    "primaryDescription": "Description of this learning style and how it applies to the student",
    "secondary": [
      { "name": "Secondary style", "percentage": 25 },
      ...
    ]
  }
}

Ensure your insights are specific, actionable, and based on educational best practices. Limit to 3 strengths, 3 areas for growth, and 3 recommendations.`

    // Generate insights using AI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxTokens: 1500,
    })

    // Parse the JSON response
    try {
      const insights = JSON.parse(text)
      return insights
    } catch (error) {
      console.error("Error parsing AI insights:", error)
      return null
    }
  } catch (error) {
    console.error("Error generating learning insights:", error)
    return null
  }
}

