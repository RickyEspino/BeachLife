// Enhanced streak calculation and motivation

export interface StreakData {
  current: number;
  longest: number;
  thisWeek: number;
  motivation: string;
  nextMilestone: number;
  progress: number; // 0-1 towards next milestone
}

export interface PointEvent {
  type: string;
  created_at: string;
  points: number;
}

export function calculateEnhancedStreak(pointEvents: PointEvent[]): StreakData {
  if (!pointEvents.length) {
    return {
      current: 0,
      longest: 0,
      thisWeek: 0,
      motivation: "Ready to start your beach journey?",
      nextMilestone: 3,
      progress: 0,
    };
  }

  // Sort events by date (most recent first)
  const sortedEvents = pointEvents.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Calculate current streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Group events by day
  const eventsByDay = new Map<string, PointEvent[]>();
  for (const event of sortedEvents) {
    const dayStr = event.created_at.split('T')[0];
    if (!eventsByDay.has(dayStr)) {
      eventsByDay.set(dayStr, []);
    }
    eventsByDay.get(dayStr)!.push(event);
  }

  const sortedDays = Array.from(eventsByDay.keys()).sort().reverse();
  
  // Calculate current streak (consecutive days with activity)
  const checkDate = new Date(today);
  while (true) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (eventsByDay.has(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (checkStr === todayStr) {
      // Allow for today if no activity yet
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  for (let i = 0; i < sortedDays.length; i++) {
    const currentDay = sortedDays[i];
    tempStreak = 1;
    
    for (let j = i + 1; j < sortedDays.length; j++) {
      const prevDay = sortedDays[j];
      const dayDiff = Math.floor(
        (new Date(currentDay).getTime() - new Date(prevDay).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (dayDiff === j - i) {
        tempStreak++;
      } else {
        break;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Calculate this week's activity
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week
  const thisWeekCount = sortedEvents.filter(event => 
    new Date(event.created_at) >= weekStart
  ).length;

  // Generate motivation message
  const motivation = getMotivationMessage(currentStreak, longestStreak, thisWeekCount);

  // Calculate next milestone and progress
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > currentStreak) || currentStreak + 30;
  const prevMilestone = milestones.filter(m => m <= currentStreak).pop() || 0;
  const progress = (currentStreak - prevMilestone) / (nextMilestone - prevMilestone);

  return {
    current: currentStreak,
    longest: longestStreak,
    thisWeek: thisWeekCount,
    motivation,
    nextMilestone,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

function getMotivationMessage(current: number, longest: number, _thisWeek: number): string {
  if (current === 0) {
    return "Start your beach streak today! 🌊";
  }
  
  if (current === 1) {
    return "Great start! Keep the momentum going 🏃‍♀️";
  }
  
  if (current >= 2 && current < 7) {
    return `${current} days strong! You're building a habit 💪`;
  }
  
  if (current >= 7 && current < 14) {
    return `Amazing! ${current} days of beach life 🌟`;
  }
  
  if (current >= 14 && current < 30) {
    return `Incredible ${current}-day streak! You're a beach regular 🏖️`;
  }
  
  if (current >= 30) {
    return `Legendary ${current}-day streak! Beach life master 🏆`;
  }
  
  if (current === longest && current > 3) {
    return `Personal best! ${current} days and counting 🔥`;
  }
  
  return `${current} days of coastal bliss! 🌅`;
}

export function getStreakBadge(streak: number): { emoji: string; title: string; color: string } {
  if (streak >= 100) return { emoji: '🏆', title: 'Legend', color: 'text-yellow-600' };
  if (streak >= 60) return { emoji: '💎', title: 'Diamond', color: 'text-purple-600' };
  if (streak >= 30) return { emoji: '🔥', title: 'Fire', color: 'text-red-600' };
  if (streak >= 14) return { emoji: '⭐', title: 'Star', color: 'text-yellow-600' };
  if (streak >= 7) return { emoji: '🌟', title: 'Rising', color: 'text-blue-600' };
  if (streak >= 3) return { emoji: '🌱', title: 'Growing', color: 'text-green-600' };
  return { emoji: '🌊', title: 'Starter', color: 'text-teal-600' };
}