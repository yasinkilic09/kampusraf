"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MessagesRealtimeRefreshProps = {
  currentUserId: string;
};

export function MessagesRealtimeRefresh({
  currentUserId,
}: MessagesRealtimeRefreshProps) {
  const router = useRouter();
  const supabase = createClient();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleRefresh() {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 350);
    }

    const receivedMessagesChannel = supabase
      .channel(`messages-inbox-received-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    const sentMessagesChannel = supabase
      .channel(`messages-inbox-sent-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      supabase.removeChannel(receivedMessagesChannel);
      supabase.removeChannel(sentMessagesChannel);
    };
  }, [currentUserId, router, supabase]);

  return null;
}