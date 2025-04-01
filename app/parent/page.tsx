"use client"

import { useSession } from "next-auth/react"

export default function ParentDashboard() {
  const { data: session } = useSession()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">👨‍👩‍👧 Welcome Parent, {session?.user?.name || "Guardian"}!</h1>
      <p className="text-muted-foreground">Track your child’s progress here.</p>
    </main>
  )
}
