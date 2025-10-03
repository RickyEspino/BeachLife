"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  initialShared: boolean;
}

// Lightweight toggle managing location sharing.
export default function LocationShareToggle({ initialShared }: Props) {
  const [shared, setShared] = useState(initialShared);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSent = useRef<{ lat: number; lng: number } | null>(null);

  const round = (n: number) => Number(n.toFixed(4));

  const sendUpdate = useCallback(async (share: boolean, pos?: GeolocationPosition) => {
    setUpdating(true);
    setError(null);
    try {
  const body: { share: boolean; lat?: number; lng?: number } = { share };
      if (share && pos) {
        body.lat = round(pos.coords.latitude);
        body.lng = round(pos.coords.longitude);
      }
      const res = await fetch('/api/shared-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      setShared(false); // revert on failure
    } finally {
      setUpdating(false);
    }
  }, []);

  const obtainAndSend = useCallback(() => {
    if (!shared) return;
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
      if (!lastSent.current || Math.abs(coords.lat - lastSent.current.lat) > 0.0008 || Math.abs(coords.lng - lastSent.current.lng) > 0.0008) {
        lastSent.current = coords;
        sendUpdate(true, pos);
      }
    }, (err) => {
      setError(err.code === err.PERMISSION_DENIED ? 'Permission denied' : 'Location error');
      setShared(false);
      sendUpdate(false);
    }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
  }, [sendUpdate, shared]);

  // Kick off periodic updates when sharing is ON
  useEffect(() => {
    if (shared) {
      obtainAndSend();
      watchTimer.current = setInterval(() => {
        if (document.visibilityState === 'visible') obtainAndSend();
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      if (watchTimer.current) clearInterval(watchTimer.current);
      watchTimer.current = null;
    }
    return () => { if (watchTimer.current) clearInterval(watchTimer.current); };
  }, [shared, obtainAndSend]);

  const onToggle = async () => {
    if (updating) return;
    const next = !shared;
    setShared(next);
    if (next) {
      // Acquire location first; send inside callback
      setError(null);
      if (!('geolocation' in navigator)) {
        setError('Geolocation not supported');
        setShared(false); return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        lastSent.current = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        sendUpdate(true, pos);
      }, (err) => {
        setError(err.code === err.PERMISSION_DENIED ? 'Permission denied' : 'Location error');
        setShared(false);
        sendUpdate(false);
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    } else {
      sendUpdate(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Share my location</div>
          <p className="text-xs text-gray-500">Others can see a rounded (approximate) spot on the public map.</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={updating}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${shared ? 'bg-emerald-500' : 'bg-gray-300'} ${updating ? 'opacity-50 cursor-wait' : ''}`}
          aria-pressed={shared}
          aria-label="Toggle location sharing"
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${shared ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
