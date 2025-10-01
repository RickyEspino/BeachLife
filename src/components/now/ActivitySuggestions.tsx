import type { ActivitySuggestion } from "@/lib/now/activitySuggestions";

interface ActivitySuggestionsProps {
  suggestions: ActivitySuggestion[];
}

export function ActivitySuggestions({ suggestions }: ActivitySuggestionsProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'active': return 'bg-red-50 border-red-200 text-red-800';
      case 'relaxed': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'social': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'solo': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No activity suggestions available right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Activity Ideas</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((activity) => (
          <div
            key={activity.id}
            className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0" aria-hidden="true">
                {activity.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {activity.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(activity.category)}`}>
                    {activity.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>⏱️ {activity.duration}</span>
                  <span className="capitalize">Best: {activity.bestTime}</span>
                </div>
                {activity.conditions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {activity.conditions.slice(0, 2).map((condition, index) => (
                      <span
                        key={index}
                        className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}