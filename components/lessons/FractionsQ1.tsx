"use client"

import { useState } from "react"

export default function FractionsQ1() {
  const [answer, setAnswer] = useState("")
  const [feedback, setFeedback] = useState("")
  const [showHint, setShowHint] = useState(false)

  const correctAnswer = "3"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (answer.trim() === correctAnswer) {
      setFeedback("✅ Well done! That’s correct. 🎉")
    } else {
      setFeedback("❌ Not quite. Remember: 1/3 + 2/3 = 3/3 = 1 whole.")
      setShowHint(true)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-lg shadow bg-white dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-4">Fractions – Question 1 🍰</h2>
      <p className="mb-4">
        If you have <strong>1/3</strong> of a cake and you get <strong>2/3</strong> more,
        how many thirds do you have in total?
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full px-4 py-2 border rounded text-black"
          placeholder="Enter your answer (e.g., 3)"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Submit Answer
        </button>
      </form>

      {feedback && <p className="mt-4 text-lg">{feedback}</p>}

      {showHint && (
        <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
          <strong>Hint:</strong> You’re adding fractions with the same denominator.
        </div>
      )}
    </div>
  )
}
