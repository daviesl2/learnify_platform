"use client"

import { useSession } from "next-auth/react"

export default function TeacherDashboard() {
  const { data: session } = useSession()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">📘 Welcome Teacher, {session?.user?.name || "Educator"}!</h1>
      <p className="text-muted-foreground">This is your teaching and monitoring space.</p>
    </main>
  )
}
