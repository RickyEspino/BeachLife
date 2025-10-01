"use client";

import { useState } from "react";
import type { Event } from "@/lib/events";

interface EventsListProps {
  events: Event[];
  showUpcoming?: boolean;
}

export function EventsList({ events, showUpcoming = false }: EventsListProps) {
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);

  const now = new Date();
  const filteredEvents = showOnlyUpcoming
    ? events.filter(event => new Date(event.start_time) > now)
    : events;

  const getEventStatus = (event: Event) => {
    const startTime = new Date(event.start_time);
    const endTime = event.end_time ? new Date(event.end_time) : null;
    
    if (endTime && now > endTime) return 'ended';
    if (now >= startTime && (!endTime || now <= endTime)) return 'live';
    if (startTime > now) {
      const minutesUntil = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
      if (minutesUntil <= 60) return `starts in ${minutesUntil}m`;
      const hoursUntil = Math.floor(minutesUntil / 60);
      if (hoursUntil <= 24) return `starts in ${hoursUntil}h`;
      const daysUntil = Math.floor(hoursUntil / 24);
      return `starts in ${daysUntil}d`;
    }
    return 'scheduled';
  };

  const getStatusColor = (status: string) => {
    if (status === 'live') return 'bg-green-100 text-green-800';
    if (status === 'ended') return 'bg-gray-100 text-gray-600';
    if (status.startsWith('starts in')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      fitness: '💪',
      social: '👥',
      food: '🍽️',
      culture: '🎨',
      sports: '🏐',
      wellness: '🧘',
    };
    return icons[category as keyof typeof icons] || '📅';
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No events {showOnlyUpcoming ? 'upcoming' : 'today'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showUpcoming && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Events</h3>
          <button
            onClick={() => setShowOnlyUpcoming(!showOnlyUpcoming)}
            className="text-xs px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50"
          >
            {showOnlyUpcoming ? 'Show All' : 'Upcoming Only'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredEvents.map(event => {
          const status = getEventStatus(event);
          return (
            <div key={event.id} className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryIcon(event.category)}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{formatTime(event.start_time)}</span>
                      {event.location && <span>📍 {event.location}</span>}
                      {event.weather_dependent && <span>🌤️ Weather dependent</span>}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}