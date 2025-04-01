"use client"

import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold mb-4">🚫 Access Denied</h1>
      <p className="text-muted-foreground mb-6">
        You don’t have permission to view this page, fam. Naughty naughty.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Take me home 🏠
      </Link>
    </main>
  )
}
