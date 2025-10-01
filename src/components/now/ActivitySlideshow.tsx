"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivitySuggestion } from '@/lib/now/activitySuggestions';

interface ActivitySlideshowProps {
  activities: ActivitySuggestion[];
}

export default function ActivitySlideshow({ activities }: ActivitySlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Auto-advance slides every 4 seconds
  useEffect(() => {
    if (!isAutoPlay || activities.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [activities.length, isAutoPlay]);

  if (!activities.length) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🏖️</div>
        <p className="text-gray-600">No activities available right now</p>
      </div>
    );
  }

  const currentActivity = activities[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + activities.length) % activities.length);
    setIsAutoPlay(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activities.length);
    setIsAutoPlay(false);
  };



  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'active': return 'from-orange-400 to-red-500';
      case 'relaxed': return 'from-green-400 to-teal-500';
      case 'social': return 'from-purple-400 to-pink-500';
      case 'solo': return 'from-blue-400 to-indigo-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="relative">
      {/* Main Slide */}
      <div className={`bg-gradient-to-br ${getCategoryColor(currentActivity.category)} rounded-2xl p-6 text-white shadow-lg transform transition-all duration-500 min-h-[200px]`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl" role="img" aria-label={currentActivity.title}>
                {currentActivity.icon}
              </span>
              <div>
                <h3 className="text-xl font-bold">{currentActivity.title}</h3>
                <p className="text-white/80 text-sm capitalize">
                  {currentActivity.category} • {currentActivity.duration}
                </p>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              {currentActivity.description}
            </p>
          </div>
        </div>

        {/* Conditions */}
        {currentActivity.conditions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {currentActivity.conditions.map((condition, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium"
              >
                {condition}
              </span>
            ))}
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevious}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            aria-label="Previous activity"
            disabled={activities.length <= 1}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Navigation spacer */}
          <div className="flex-1" />

          <button
            onClick={goToNext}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            aria-label="Next activity"
            disabled={activities.length <= 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Auto-play indicator */}
      {isAutoPlay && activities.length > 1 && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
        </div>
      )}

      {/* Activity counter */}
      <div className="text-center mt-3 text-sm text-gray-600">
        {currentIndex + 1} of {activities.length} suggestions
      </div>
    </div>
  );
}