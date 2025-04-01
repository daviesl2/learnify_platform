'use client';

import { useState } from 'react';

export default function DailyXPButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEarnXP = async () => {
    setLoading(true);
    const res = await fetch('/api/earn-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    setMessage(data.message || 'XP granted');
    setLoading(false);
  };

  return (
    <div className="p-4 rounded-xl bg-gray-100 shadow-md w-fit space-y-3">
      <button
        onClick={handleEarnXP}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        disabled={loading}
      >
        {loading ? 'Processing...' : '🎯 Earn Daily XP'}
      </button>
      {message && <p className="text-green-600 text-sm">{message}</p>}
    </div>
  );
}
