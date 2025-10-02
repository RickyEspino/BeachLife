"use client";
import { useState, useEffect } from 'react';

export type CategoryChipOption = {
  id: string;
  label: string;
  icon?: string; // simple emoji or tailwind-friendly string
};

interface CategoryChipsProps {
  options: CategoryChipOption[];
  onChange?: (active: string[] | null) => void;
  multiple?: boolean;
  initial?: string[];
  className?: string;
  variant?: 'google' | 'snap';
}

// Responsive horizontally scrollable chip bar inspired by Google Maps & Snapchat
export function CategoryChips({ options, onChange, multiple = false, initial, className = '', variant = 'google' }: CategoryChipsProps) {
  const [active, setActive] = useState<string[]>(() => initial || []);

  useEffect(() => { onChange?.(active.length ? active : null); }, [active, onChange]);

  function toggle(id: string) {
    setActive(curr => {
      if (multiple) {
        return curr.includes(id) ? curr.filter(c => c !== id) : [...curr, id];
      }
      return curr[0] === id ? [] : [id];
    });
  }

  const baseStyle = variant === 'snap'
    ? 'bg-gradient-to-b from-white/95 to-white/70 backdrop-blur-xl rounded-2xl shadow-md border border-white/60'
    : 'bg-white rounded-full shadow border';

  return (
  <div className={`flex gap-2 overflow-x-auto no-scrollbar px-3 py-2 ${variant === 'snap' ? 'snap-x snap-mandatory' : ''} ${className}`}
         style={{ WebkitOverflowScrolling: 'touch' }}>
      {options.map(opt => {
        const selected = active.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`flex items-center gap-1 whitespace-nowrap px-3 h-9 text-sm font-medium transition-colors ${baseStyle} ${selected ? 'bg-black text-white shadow-inner' : 'hover:bg-gray-100 text-gray-800'}`}
          >
            {opt.icon && <span className="text-base leading-none">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CategoryChips;
