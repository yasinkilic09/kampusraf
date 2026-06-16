import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { NotificationBell } from "@/components/notification-bell";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const SLATE = "#64748B";
const CARD = "#FFFFFF";

function TabIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CARD }} edges={["top"]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: GREEN,
          tabBarInactiveTintColor: SLATE,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: Math.max(insets.bottom, 8),
            height: 66,
            paddingBottom: 9,
            paddingTop: 8,
            backgroundColor: CARD,
            borderTopWidth: 0,
            borderRadius: 26,
            shadowColor: "#0F172A",
            shadowOpacity: 0.14,
            shadowRadius: 18,
            elevation: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "800",
          },
          tabBarItemStyle: {
            paddingBottom: 2,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Panel",
            tabBarAccessibilityLabel: "Panel sekmesi",
            tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: "Akış",
            tabBarAccessibilityLabel: "Akış sekmesi",
            tabBarIcon: ({ color }) => <TabIcon name="leaf" color={color} />,
          }}
        />
        <Tabs.Screen
          name="share"
          options={{
            title: "Paylaş",
            tabBarAccessibilityLabel: "Paylaş sekmesi",
            tabBarActiveTintColor: AMBER,
            tabBarIcon: ({ color }) => <TabIcon name="add-circle" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Ara",
            tabBarAccessibilityLabel: "Ara sekmesi",
            tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menü",
            tabBarAccessibilityLabel: "Menü sekmesi",
            tabBarIcon: ({ color }) => <TabIcon name="grid" color={color} />,
          }}
        />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="audio" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
      <NotificationBell />
    </SafeAreaView>
  );
}
