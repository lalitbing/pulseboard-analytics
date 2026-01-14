import { useState } from 'react';
import { trackEvent } from '../api/analytics';

export default function EventTracker() {
  const [eventName, setEventName] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName.trim()) {
      return;
    }

    setIsTracking(true);
    try {
      await trackEvent(eventName.trim());
      // Refresh the page after successful tracking
      window.location.reload();
    } catch (error) {
      console.error('Failed to track event:', error);
      alert('Failed to track event. Please try again.');
      setIsTracking(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex flex-col">
        <label htmlFor="event-name" className="text-sm font-medium text-gray-700 mb-1">
          Track Event
        </label>
        <input
          id="event-name"
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="Enter event name"
          className="border rounded px-3 py-2 min-w-[200px]"
          disabled={isTracking}
        />
      </div>
      <button
        type="submit"
        disabled={!eventName.trim() || isTracking}
        className={
          'px-4 py-2 rounded text-sm font-medium transition ' +
          (eventName.trim() && !isTracking
            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed')
        }
      >
        {isTracking ? 'Tracking...' : 'Track'}
      </button>
    </form>
  );
}
