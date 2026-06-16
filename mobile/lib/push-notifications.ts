import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { getMobileRouteFromUrl } from "@/lib/navigation-routes";
import { supabase } from "@/lib/supabase";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

function isExpoGo() {
  return Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
}

async function getNotificationsModule() {
  if (Platform.OS === "web" || isExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications");
  }

  const notifications = await notificationsModulePromise;

  if (!notificationHandlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return notifications;
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

function extractUrlFromNotification(notification: { request?: { content?: { data?: Record<string, unknown> } } } | null | undefined) {
  const url = notification?.request?.content?.data?.url;
  return typeof url === "string" ? url : null;
}

export function usePushNotificationObserver() {
  React.useEffect(() => {
    let responseSubscription: { remove: () => void } | null = null;
    let active = true;

    async function setup() {
      const notifications = await getNotificationsModule();
      if (!notifications || !active) return;

      function redirectFromNotification(notification: { request?: { content?: { data?: Record<string, unknown> } } } | null | undefined) {
        const url = extractUrlFromNotification(notification);
        const mobileRoute = getMobileRouteFromUrl(url);

        if (mobileRoute) {
          router.push(mobileRoute as never);
        }
      }

      const initialResponse = notifications.getLastNotificationResponse();
      if (initialResponse?.notification) {
        redirectFromNotification(initialResponse.notification);
      }

      responseSubscription = notifications.addNotificationResponseReceivedListener((response) => {
        redirectFromNotification(response.notification);
      });
    }

    setup();

    return () => {
      active = false;
      responseSubscription?.remove();
    };
  }, []);
}

export async function registerForPushNotificationsAsync(userId: string) {
  if (Platform.OS === "web") {
    return { ok: false, reason: "web-unsupported" as const };
  }

  if (isExpoGo()) {
    return { ok: false, reason: "expo-go-unsupported" as const };
  }

  const notifications = await getNotificationsModule();

  if (!notifications) {
    return { ok: false, reason: "notifications-unavailable" as const };
  }

  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2E7D5B",
    });
  }

  const { status: existingStatus } = await notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { ok: false, reason: "permission-denied" as const };
  }

  const projectId = getProjectId();

  if (!projectId) {
    return { ok: false, reason: "missing-project-id" as const };
  }

  const tokenResult = await notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResult.data;

  try {
    const { error } = await supabase.from("user_push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,expo_push_token",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.warn("PUSH_TOKEN_SYNC_ERROR", error.message);
    }
  } catch (error) {
    console.warn("PUSH_TOKEN_SYNC_ERROR", error);
  }

  return {
    ok: true,
    token: expoPushToken,
  };
}

export async function sendExpoPushNotification({
  tokens,
  title,
  body,
  url,
}: {
  tokens: string[];
  title: string;
  body: string;
  url?: string | null;
}) {
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

  if (uniqueTokens.length === 0) return;

  const messages = uniqueTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data: url ? { url } : {},
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.warn("EXPO_PUSH_SEND_ERROR", error);
  }
}

export async function getUserPushTokens(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId);

    if (error) {
      console.warn("USER_PUSH_TOKEN_FETCH_ERROR", error.message);
      return [];
    }

    return (data || []).map((item) => item.expo_push_token).filter(Boolean) as string[];
  } catch (error) {
    console.warn("USER_PUSH_TOKEN_FETCH_EXCEPTION", error);
    return [];
  }
}
