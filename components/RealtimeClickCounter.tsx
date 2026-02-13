"use client";

/**
 * RouteGenius — Real-time Click Counter
 *
 * Shows a live count of clicks arriving via Supabase Realtime subscriptions.
 */

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface RealtimeClickCounterProps {
  linkId: string;
}

export default function RealtimeClickCounter({
  linkId,
}: RealtimeClickCounterProps) {
  const [recentClicks, setRecentClicks] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel(`clicks:${linkId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "click_events",
          filter: `link_id=eq.${linkId}`,
        },
        () => setRecentClicks((prev) => prev + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkId]);

  if (recentClicks === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700 border border-lime-200 animate-pulse">
      +{recentClicks} en tiempo real
    </span>
  );
}
