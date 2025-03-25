import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { studentResponse, questionContext, subject, topic, correctAnswer, studentId, questionId, studentHistory } =
      await req.json()

    if (!studentResponse || !questionContext) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // Build the prompt for the AI
    const prompt = `You are an expert ${subject} teacher with experience in personalized education. 
    
    QUESTION CONTEXT:
    ${questionContext}
    
    STUDENT RESPONSE:
    ${studentResponse}
    
    ${correctAnswer ? `CORRECT ANSWER: ${correctAnswer}` : ""}
    
    SUBJECT: ${subject}
    TOPIC: ${topic}
    
    ${
      studentHistory
        ? `STUDENT LEARNING HISTORY:
    ${JSON.stringify(studentHistory, null, 2)}`
        : ""
    }
    
    Please analyze the student's response and provide detailed, constructive feedback. Your feedback should be:
    1. Specific to the student's response
    2. Aligned with ${subject} educational standards
    3. Encouraging and supportive
    4. Focused on both strengths and areas for improvement
    5. Include next steps for learning
    
    Format your response as a JSON object with the following structure:
    {
      "overallFeedback": "A paragraph of general feedback",
      "strengthPoints": ["Strength 1", "Strength 2", ...],
      "improvementPoints": ["Area 1", "Area 2", ...],
      "nextSteps": ["Next step 1", "Next step 2", ...],
      "conceptualUnderstanding": "excellent|good|partial|limited|unclear",
      "suggestedResources": [
        {
          "title": "Resource title",
          "type": "video|article|practice|interactive",
          "url": "optional URL",
          "description": "Brief description"
        }
      ],
      "misconceptions": ["Misconception 1", "Misconception 2", ...]
    }
    
    Ensure your feedback follows educational best practices and is appropriate for the student's level.`

    // Generate feedback using AI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxTokens: 1500,
    })

    // Parse the JSON response
    let feedback
    try {
      feedback = JSON.parse(text)
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return NextResponse.json({ success: false, message: "Failed to parse AI response" }, { status: 500 })
    }

    // Save the feedback to the database if questionId is provided
    if (questionId && studentId) {
      try {
        // Save feedback logic here
        // This would typically involve a database call to store the feedback
        // For example:
        // await prisma.feedback.create({
        //   data: {
        //     questionId,
        //     studentId,
        //     feedback: JSON.stringify(feedback),
        //     createdAt: new Date(),
        //   },
        // })
      } catch (error) {
        console.error("Error saving feedback:", error)
        // Continue even if saving fails
      }
    }

    return NextResponse.json({
      success: true,
      feedback,
    })
  } catch (error) {
    console.error("Error generating feedback:", error)
    return NextResponse.json({ success: false, message: "Failed to generate feedback" }, { status: 500 })
  }
}

