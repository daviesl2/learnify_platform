// app/api/peer-teaching/teach-back/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, questionId, answer, correct } = await req.json()

    if (!userId || !sessionId || !questionId || !answer || correct === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("teach_back_responses")
      .insert([
        {
          user_id: userId,
          session_id: sessionId,
          question_id: questionId,
          answer: answer,
          correct: correct,
        },
      ])
      .select()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ message: "Failed to save teach back response", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Teach back response saved successfully", data: data }, { status: 201 })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ message: "Internal server error", error: (error as any).message }, { status: 500 })
  }
}

