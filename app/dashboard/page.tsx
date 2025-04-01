"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import LessonViewer from "@/components/LessonViewer"

interface LessonStep {
  type: "text" | "video" | "quiz"
  content: string
}

interface Lesson {
  title: string
  steps: LessonStep[]
}

const sampleLesson: Lesson = {
  title: "Water Cycle Basics 🌧️",
  steps: [
    { type: "text", content: "The water cycle has 3 key stages..." },
    { type: "video", content: "https://www.youtube.com/embed/1ZkB1eVNTW0" },
    { type: "quiz", content: "What are the three main stages?" },
  ],
}

export default function DashboardRedirectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    const role = session?.user?.role

    if (!role) {
      router.push("/unauthorized")
    } else {
      router.push(`/${role}`)
    }
  }, [session, status, router])

  return (
    <main className="p-8 space-y-8 text-center">
      <p className="text-lg">Loading your dashboard, fam... ⏳</p>

      {/* This is where we test the interactive lesson */}
      <LessonViewer lesson={sampleLesson} />
    </main>
  )
}
