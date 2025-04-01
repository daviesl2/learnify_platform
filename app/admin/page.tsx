"use client"

import { useSession } from "next-auth/react"

export default function AdminDashboard() {
  const { data: session } = useSession()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">🛡️ Welcome Admin, {session?.user?.name || "Boss"}!</h1>
      <p className="text-muted-foreground">Manage users, content, and platform analytics here.</p>
    </main>
  )
}
