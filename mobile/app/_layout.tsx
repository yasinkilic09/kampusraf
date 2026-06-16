import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLaunchScreen } from "@/components/app-launch-screen";
import { registerForPushNotificationsAsync, usePushNotificationObserver } from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";

SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);

  usePushNotificationObserver();

  const handleLaunchFinish = useCallback(() => {
    setShowLaunchScreen(false);
  }, []);

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function syncPushForUser(userId?: string | null) {
      if (!active || !userId) return;
      await registerForPushNotificationsAsync(userId);
    }

    async function bootstrapPush() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      await syncPushForUser(userId);

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        await syncPushForUser(session?.user?.id);
      });

      authSubscription = data.subscription;
    }

    bootstrapPush();

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FAF7F0" />
      <Stack screenOptions={{ headerShown: false }} />
      <AppLaunchScreen
        visible={showLaunchScreen}
        onFinish={handleLaunchFinish}
      />
    </SafeAreaProvider>
  );
}
