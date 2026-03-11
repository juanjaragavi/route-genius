"use client";

/**
 * RouteGenius — Real-time Click Counter
 *
 * Shows a live count of new clicks via polling the public analytics API.
 * Polls every 5 seconds and displays the delta since the component mounted.
 */

import { useEffect, useRef, useState } from "react";

interface RealtimeClickCounterProps {
  linkId: string;
}

export default function RealtimeClickCounter({
  linkId,
}: RealtimeClickCounterProps) {
  const [recentClicks, setRecentClicks] = useState(0);
  const baselineRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/analytics/${linkId}/public`);
        if (!res.ok) return;
        const { total_clicks } = await res.json();
        if (!active) return;

        if (baselineRef.current === null) {
          baselineRef.current = total_clicks;
        } else {
          const delta = total_clicks - baselineRef.current;
          if (delta > 0) setRecentClicks(delta);
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [linkId]);

  if (recentClicks === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700 border border-lime-200 animate-pulse">
      +{recentClicks} en tiempo real
    </span>
  );
}
