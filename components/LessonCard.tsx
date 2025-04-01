import React from "react"

interface LessonCardProps {
  title: string
  description: string
  subject: string
  level: string
}

const LessonCard: React.FC<LessonCardProps> = ({ title, description, subject, level }) => {
  return (
    <div className="border p-4 rounded-md shadow bg-white dark:bg-gray-900">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="text-sm mt-2">
        <strong>Subject:</strong> {subject} <br />
        <strong>Level:</strong> {level}
      </div>
    </div>
  )
}

export default LessonCard
