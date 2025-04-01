"use client";
import { useState } from "react";

export default function GlobalSettingsPanel() {
  const [settings, setSettings] = useState({
    aiLessonLauncher: true,
    xpSystem: true,
    lifeSkills: true,
    textToSpeech: true,
    gamification: true,
    revisionNotes: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    // Add API call here to persist toggle
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-2xl font-bold mb-4">Global Settings Panel</h2>
      {Object.entries(settings).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between border-b py-3">
          <span className="capitalize text-lg">{key.replace(/([A-Z])/g, " $1")}</span>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={() => toggleSetting(key as keyof typeof settings)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 relative" />
          </label>
        </div>
      ))}
    </div>
  );
}
