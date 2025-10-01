// Mock events data structure - in real app this would come from Supabase
export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string; // ISO datetime
  end_time?: string;
  location?: string;
  is_outdoor: boolean;
  category: 'fitness' | 'social' | 'food' | 'culture' | 'sports' | 'wellness';
  weather_dependent: boolean;
}

// Mock data for demo - in production this would be a Supabase query
export function getTodaysEvents(): Event[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  return [
    {
      id: '1',
      title: 'Morning Beach Yoga',
      description: 'Start your day with sunrise yoga on the sand',
      start_time: `${todayStr}T07:00:00.000Z`,
      end_time: `${todayStr}T08:00:00.000Z`,
      location: 'Main Beach',
      is_outdoor: true,
      category: 'wellness',
      weather_dependent: true,
    },
    {
      id: '2',
      title: 'Surf Lessons',
      description: 'Beginner-friendly surf instruction',
      start_time: `${todayStr}T10:00:00.000Z`,
      end_time: `${todayStr}T12:00:00.000Z`,
      location: 'Surf Break Point',
      is_outdoor: true,
      category: 'sports',
      weather_dependent: true,
    },
    {
      id: '3',
      title: 'Beach Volleyball Tournament',
      description: 'Weekly pickup games and tournament',
      start_time: `${todayStr}T16:00:00.000Z`,
      end_time: `${todayStr}T18:00:00.000Z`,
      location: 'Volleyball Courts',
      is_outdoor: true,
      category: 'sports',
      weather_dependent: true,
    },
    {
      id: '4',
      title: 'Sunset Photography Walk',
      description: 'Capture the golden hour along the coastline',
      start_time: `${todayStr}T18:30:00.000Z`,
      end_time: `${todayStr}T20:00:00.000Z`,
      location: 'Coastal Trail',
      is_outdoor: true,
      category: 'culture',
      weather_dependent: false,
    },
  ];
}

export function getUpcomingEvents(days: number = 7): Event[] {
  // Mock upcoming events
  const events: Event[] = [];
  const today = new Date();
  
  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    events.push({
      id: `future-${i}`,
      title: i % 2 === 0 ? 'Beach Fitness Bootcamp' : 'Coastal Meditation',
      start_time: `${dateStr}T07:00:00.000Z`,
      location: 'Beach Front',
      is_outdoor: true,
      category: i % 2 === 0 ? 'fitness' : 'wellness',
      weather_dependent: true,
    });
  }
  
  return events;
}