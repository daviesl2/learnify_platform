"use client"

import React from "react"

type LessonStep = {
  type: "text" | "video" | "quiz"
  content: string
}

type Lesson = {
  title: string
  steps: LessonStep[]
}

interface LessonViewerProps {
  lesson: Lesson
}

export default function LessonViewer({ lesson }: LessonViewerProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const step = lesson.steps[currentStep]

  const handleNext = () => {
    if (currentStep < lesson.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-white shadow">
      <h2 className="text-2xl font-bold">{lesson.title}</h2>

      <div className="border p-4 rounded bg-muted">
        {step.type === "text" && <p>{step.content}</p>}
        {step.type === "video" && (
          <iframe
            src={step.content}
            className="w-full aspect-video"
            allowFullScreen
          ></iframe>
        )}
        {step.type === "quiz" && <p>🧠 Quiz: {step.content}</p>}
      </div>

      <div className="flex justify-between">
        <button
          className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleNext}
          disabled={currentStep === lesson.steps.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  )
}
