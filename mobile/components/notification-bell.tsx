import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const CARD = "#FFFFFF";
const RED = "#DC2626";

export function NotificationBell() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const shouldHide = useMemo(
    () =>
      pathname.startsWith("/auth") ||
      pathname.startsWith("/notifications"),
    [pathname]
  );

  useEffect(() => {
    if (shouldHide) return;

    let active = true;

    async function fetchUnread(nextUserId?: string | null) {
      if (!nextUserId) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", nextUserId)
        .eq("is_read", false);

      if (active) {
        setUnreadCount(count || 0);
      }
    }

    async function subscribeForUser(nextUserId: string | null) {
      if (!nextUserId) {
        setUnreadCount(0);
        setUserId(null);
        return;
      }

      setUserId(nextUserId);
      await fetchUnread(nextUserId);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(
        `mobile-notifications:${nextUserId}:${Date.now()}`
      );

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${nextUserId}`,
        },
        async () => {
          await fetchUnread(nextUserId);
        }
      );

      channel.subscribe();
      channelRef.current = channel;
    }

    async function setup() {
      const { data: sessionData } = await supabase.auth.getSession();
      const nextUserId = sessionData.session?.user?.id || null;

      if (!active) return;

      await subscribeForUser(nextUserId);

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!active) return;
        await subscribeForUser(session?.user?.id || null);
      });

      return data.subscription;
    }

    let authSubscription: { unsubscribe: () => void } | null = null;
    let interactionTask: { cancel: () => void } | null = null;

    interactionTask = InteractionManager.runAfterInteractions(() => {
      setup().then((subscription) => {
        authSubscription = subscription || null;
      });
    });

    return () => {
      active = false;
      interactionTask?.cancel();
      authSubscription?.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [shouldHide]);

  if (shouldHide || !userId) {
    return null;
  }

  return (
    <Pressable
      style={[styles.button, { top: insets.top + 8 }]}
      onPress={() => router.push("/notifications" as never)}
      accessibilityRole="button"
      accessibilityLabel="Bildirimler"
    >
      <Ionicons name={unreadCount > 0 ? "notifications" : "notifications-outline"} size={22} color={GREEN} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 16,
    zIndex: 30,
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  badge: {
    position: "absolute",
    right: -1,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
