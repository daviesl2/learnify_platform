"use client";

import { useState, useEffect } from "react";

const studentId = "cm8wxe39k0000kx4oyl4kmdad"; // Replace with real student ID

export default function AiLessonLauncher() {
  const [lesson, setLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [currentXp, setCurrentXp] = useState<number | null>(null);

  const fetchCurrentXp = async () => {
    try {
      const res = await fetch("/api/get-student-xp", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentXp(data.currentXP); 
      } else {
        console.error("Failed to fetch XP");
      }
    } catch (err) {
      console.error("Failed to fetch XP", err);
    }
  };

  useEffect(() => {
    fetchCurrentXp(); 
  }, []);

  const generateLesson = async () => {
    setLoading(true);
    setXpEarned(null);

    try {
      const res = await fetch("/api/ai-lesson-launcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      const data = await res.json();
      setLesson(data.lesson);

      const xpRes = await fetch("/api/update-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, xpGained: 10 }),
      });

      const xpData = await xpRes.json();
      setXpEarned(10);
      setCurrentXp(xpData.newXP);
    } catch (err) {
      console.error("Error generating lesson or awarding XP:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg space-y-4">
      <h2 className="text-2xl font-bold">AI Lesson Launcher</h2>

      {/* Display current XP */}
      {currentXp !== null && (
        <div className="text-xl font-semibold text-blue-600">
          🧠 Current XP: {currentXp}
        </div>
      )}

      {/* XP Progress Bar */}
      {currentXp !== null && (
        <div className="xp-progress-bar-container">
          <div className="xp-progress-label">XP: {currentXp}</div>
          <div className="xp-progress-bar">
            <div
              className="xp-progress"
              style={{ width: `${(currentXp / 100) * 100}%` }} // Assuming 100 XP for one level
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={generateLesson}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Lesson"}
      </button>

      {lesson && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-xl border space-y-2">
          <h3 className="text-xl font-semibold">Generated Lesson:</h3>
          <p>{lesson}</p>

          {xpEarned !== null && (
            <div className="mt-3 text-green-600 font-bold">
              🪙 XP Earned: {xpEarned}
            </div>
          )}
        </div>
      )}
      
      {/* CSS Styling for the XP Progress Bar */}
      <style jsx>{`
        .xp-progress-bar-container {
          display: flex;
          flex-direction: column;
          margin-top: 20px;
        }

        .xp-progress-label {
          font-size: 1.2rem;
          color: #4A90E2;
        }

        .xp-progress-bar {
          width: 100%;
          background-color: #e0e0e0;
          border-radius: 8px;
          height: 10px;
          margin-top: 10px;
          position: relative;
        }

        .xp-progress {
          height: 100%;
          background-color: #4A90E2;
          border-radius: 8px;
          transition: width 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
