"use client";

import { useEffect, useState } from "react";

// Words + Tailwind text color classes
const WORDS: { word: string; color: string }[] = [
  { word: "beach", color: "text-teal-600" },
  { word: "shore", color: "text-sky-600" },
  { word: "sand", color: "text-amber-600" },
  { word: "coast", color: "text-emerald-600" },
  { word: "surf", color: "text-indigo-600" },
];

/**
 * RotatingBeachHeader
 * Life is better on the (rotating word)
 * - Rotates every 3 seconds
 * - Each word has a distinct color
 * - Forced line break before rotating word to prevent horizontal layout shift
 */
export function RotatingBeachHeader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const current = WORDS[index];

  return (
    <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
      <span className="block">Life is better on the</span>
      <span
        key={current.word}
        className={`block min-h-[1.1em] transition-colors duration-700 ${current.color}`}
        aria-live="polite"
      >
        {current.word}
      </span>
    </h2>
  );
}

export default RotatingBeachHeader;

