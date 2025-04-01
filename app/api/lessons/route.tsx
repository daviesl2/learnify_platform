import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET: Fetch all lessons
export async function GET() {
  try {
    const lessons = await prisma.lesson.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(lessons)
  } catch (error) {
    console.error("GET lessons error:", error)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
}

// POST: Create a new lesson
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, description, subject, level, content } = body

    if (!title || !description || !subject || !level || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const newLesson = await prisma.lesson.create({
      data: {
        title,
        description,
        subject,
        level,
        content,
      },
    })

    return NextResponse.json(newLesson)
  } catch (error) {
    console.error("POST lesson error:", error)
        return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
      }
    }
