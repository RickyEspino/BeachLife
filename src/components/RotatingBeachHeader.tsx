"use client";

import { useEffect, useState } from "react";

// Words + Tailwind text color classes (just the changing noun)
const WORDS: { word: string; color: string }[] = [
  { word: "BEACH", color: "text-teal-500" },
  { word: "SHORE", color: "text-sky-500" },
  { word: "SAND", color: "text-amber-500" },
  { word: "COAST", color: "text-emerald-500" },
  { word: "SURF", color: "text-indigo-500" },
];

/**
 * RotatingBeachHeader
 * "Life is better"
 * "ON THE {ROTATING WORD}"
 * - Rotates every 3 seconds
 * - Second line is uppercase
 * - Forced line break to avoid layout shift
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
    <h2 className="text-3xl text-black font-bold leading-tight tracking-tight sm:text-4xl">
      <span className="block">Life is better</span>
      <span
        key={current.word}
        className="block min-h-[1.1em] uppercase"
        aria-live="polite"
      >
        <span className="text-black">ON THE </span>
        <span className={`transition-colors duration-700 ${current.color}`}>
          {current.word}
        </span>
      </span>
    </h2>
  );
}

export default RotatingBeachHeader;
