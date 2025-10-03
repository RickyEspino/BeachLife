// Activity suggestion engine based on weather, time, and context

export interface ActivitySuggestion {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'active' | 'relaxed' | 'social' | 'solo';
  icon: string;
  conditions: string[];
  bestTime: 'morning' | 'midday' | 'afternoon' | 'evening' | 'any';
  weatherRequirement: 'sunny' | 'cloudy' | 'any' | 'avoid-rain';
}

const ACTIVITIES: ActivitySuggestion[] = [
  {
    id: 'beach-walk',
    title: 'Beach Walk',
    description: 'Peaceful stroll along the shoreline',
    duration: '20-60 min',
    category: 'relaxed',
    icon: '🚶‍♀️',
    conditions: ['low UV', 'calm wind'],
    bestTime: 'morning',
    weatherRequirement: 'any',
  },
  {
    id: 'sunrise-yoga',
    title: 'Sunrise Yoga',
    description: 'Start your day with beach meditation',
    duration: '30-45 min',
    category: 'relaxed',
    icon: '🧘‍♀️',
    conditions: ['early morning', 'calm conditions'],
    bestTime: 'morning',
    weatherRequirement: 'any',
  },
  {
    id: 'beach-volleyball',
    title: 'Beach Volleyball',
    description: 'Join a pickup game or practice serves',
    duration: '1-2 hours',
    category: 'active',
    icon: '🏐',
    conditions: ['good weather', 'moderate wind'],
    bestTime: 'afternoon',
    weatherRequirement: 'sunny',
  },
  {
    id: 'surfing',
    title: 'Surfing',
    description: 'Catch some waves and ride the surf',
    duration: '1-3 hours',
    category: 'active',
    icon: '🏄‍♂️',
    conditions: ['rising tide', 'moderate wind'],
    bestTime: 'morning',
    weatherRequirement: 'any',
  },
  {
    id: 'beach-reading',
    title: 'Beach Reading',
    description: 'Relax with a book under an umbrella',
    duration: '30+ min',
    category: 'solo',
    icon: '📚',
    conditions: ['shade available', 'comfortable temp'],
    bestTime: 'any',
    weatherRequirement: 'avoid-rain',
  },
  {
    id: 'photography',
    title: 'Beach Photography',
    description: 'Capture coastal landscapes and moments',
    duration: '30-90 min',
    category: 'solo',
    icon: '📸',
    conditions: ['good light', 'interesting weather'],
    bestTime: 'any',
    weatherRequirement: 'any',
  },
  {
    id: 'picnic',
    title: 'Beach Picnic',
    description: 'Enjoy a meal with ocean views',
    duration: '1-2 hours',
    category: 'social',
    icon: '🧺',
    conditions: ['calm wind', 'comfortable temp'],
    bestTime: 'midday',
    weatherRequirement: 'sunny',
  },
  {
    id: 'tide-pooling',
    title: 'Tide Pooling',
    description: 'Explore marine life in rocky pools',
    duration: '30-90 min',
    category: 'relaxed',
    icon: '🦀',
    conditions: ['low tide', 'daylight'],
    bestTime: 'morning',
    weatherRequirement: 'any',
  },
  {
    id: 'beach-run',
    title: 'Beach Run',
    description: 'Jog along the water\'s edge',
    duration: '20-60 min',
    category: 'active',
    icon: '🏃‍♂️',
    conditions: ['firm sand', 'cool temperature'],
    bestTime: 'morning',
    weatherRequirement: 'any',
  },
  {
    id: 'sunset-watching',
    title: 'Sunset Watching',
    description: 'End the day with golden hour views',
    duration: '30-60 min',
    category: 'relaxed',
    icon: '🌅',
    conditions: ['clear horizon', 'evening'],
    bestTime: 'evening',
    weatherRequirement: 'any',
  },
  {
    id: 'swimming',
    title: 'Ocean Swimming',
    description: 'Take a refreshing dip in the waves',
    duration: '15-45 min',
    category: 'active',
    icon: '🏊‍♀️',
    conditions: ['warm water', 'calm conditions'],
    bestTime: 'midday',
    weatherRequirement: 'sunny',
  },
  {
    id: 'frisbee',
    title: 'Beach Frisbee',
    description: 'Play catch on the open sand',
    duration: '30-60 min',
    category: 'social',
    icon: '🥏',
    conditions: ['open space', 'light wind'],
    bestTime: 'afternoon',
    weatherRequirement: 'sunny',
  },
  {
    id: 'sunset-walk',
    title: 'Sunset Walk',
    description: 'Peaceful evening stroll as day ends',
    duration: '20-45 min',
    category: 'relaxed',
    icon: '🚶‍♂️',
    conditions: ['golden hour', 'comfortable temp'],
    bestTime: 'evening',
    weatherRequirement: 'any',
  },
  {
    id: 'meditation',
    title: 'Beach Meditation',
    description: 'Find inner peace with ocean sounds',
    duration: '10-30 min',
    category: 'solo',
    icon: '🧘‍♀️',
    conditions: ['quiet spot', 'calm atmosphere'],
    bestTime: 'morning',
    weatherRequirement: 'any',
  },
];

interface WeatherContext {
  tempC: number;
  precipProb: number;
  windKph: number;
  cloudCover: number;
  condition: string;
}

interface TimeContext {
  hour: number;
  isWeekend: boolean;
}

interface TideContext {
  phase: 'low' | 'mid-rising' | 'high' | 'mid-falling';
  current: 'rising' | 'falling';
}

export function getActivitySuggestions(
  weather: WeatherContext,
  time: TimeContext,
  tide?: TideContext
): ActivitySuggestion[] {
  const timeOfDay = getTimeOfDay(time.hour);
  const suggestions: { activity: ActivitySuggestion; score: number }[] = [];

  for (const activity of ACTIVITIES) {
    let score = 50; // Base score

    // Enhanced time-based scoring with stronger preference
    if (activity.bestTime === timeOfDay) {
      score += 30; // Strong preference for perfect time match
    } else if (activity.bestTime === 'any') {
      score += 15; // Moderate preference for flexible activities
    } else {
      score -= 10; // Penalty for wrong time activities
    }

    // Additional time-specific bonuses
    if (timeOfDay === 'morning') {
      if (activity.id === 'sunrise-yoga' || activity.id === 'beach-walk') score += 15;
      if (activity.id === 'surfing') score += 10; // Best waves in morning
    } else if (timeOfDay === 'midday') {
      if (activity.id === 'swimming' || activity.id === 'beach-volleyball') score += 15;
    } else if (timeOfDay === 'afternoon') {
      if (activity.id === 'picnic' || activity.id === 'frisbee') score += 15;
    } else if (timeOfDay === 'evening') {
      if (activity.id === 'sunset-walk' || activity.id === 'beach-reading') score += 15;
      if (activity.id === 'photography') score += 10; // Golden hour
    }

    // Weather matching
    if (activity.weatherRequirement === 'sunny' && weather.condition.includes('Clear')) {
      score += 15;
    } else if (activity.weatherRequirement === 'cloudy' && weather.cloudCover > 50) {
      score += 15;
    } else if (activity.weatherRequirement === 'avoid-rain' && weather.precipProb > 40) {
      score -= 30;
    }

    // Temperature considerations
    if (activity.category === 'active') {
      if (weather.tempC < 15 || weather.tempC > 32) score -= 15;
      else if (weather.tempC >= 18 && weather.tempC <= 28) score += 10;
    }

    // UV considerations removed

    // Wind considerations
    if (activity.id === 'beach-volleyball' || activity.id === 'picnic') {
      if (weather.windKph > 25) score -= 15;
      else if (weather.windKph <= 15) score += 10;
    }

    // Tide considerations
    if (tide) {
      if (activity.id === 'tide-pooling' && tide.phase === 'low') score += 25;
      if (activity.id === 'surfing' && tide.current === 'rising') score += 15;
    }

    // Weekend boost for social activities
    if (time.isWeekend && activity.category === 'social') {
      score += 10;
    }

    // Early morning boost for calm activities
    if (time.hour < 8 && (activity.category === 'relaxed' || activity.category === 'solo')) {
      score += 10;
    }

    suggestions.push({ activity, score });
  }

  // Sort by score and return top suggestions
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(s => s.activity);
}

function getTimeOfDay(hour: number): 'morning' | 'midday' | 'afternoon' | 'evening' {
  if (hour < 10) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 18) return 'afternoon';
  return 'evening';
}