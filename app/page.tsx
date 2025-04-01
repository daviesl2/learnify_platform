export default function HomePage() {
  return (
    <main className="p-10 space-y-4">
      <h1 className="text-3xl font-bold">🔥 Learnify Is Live!</h1>
      <p className="text-muted-foreground">Welcome to the Learnify platform homepage.</p>

      <a
        href="/dashboard"
        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Go to Dashboard
      </a>
    </main>
  )
}
