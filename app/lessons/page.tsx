import LessonCard from "@/components/LessonCard"

async function getLessons() {
  const res = await fetch("http://localhost:3000/api/lessons", { cache: "no-store" })
  return res.json()
}

export default async function LessonsPage() {
  const lessons = await getLessons()

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">📚 All Lessons</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson: any) => (
          <LessonCard
            key={lesson.id}
            title={lesson.title}
            description={lesson.description}
            subject={lesson.subject}
            level={lesson.level}
          />
        ))}
      </div>
    </main>
  )
}
