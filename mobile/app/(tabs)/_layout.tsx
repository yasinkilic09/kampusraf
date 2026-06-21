import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
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
  focused,
  tone = "green",
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
  tone?: "green" | "amber";
}) {
  return (
    <View
      style={[
        styles.tabIconShell,
        focused && (tone === "amber" ? styles.tabIconAmber : styles.tabIconActive),
      ]}
    >
      <Ionicons name={name} size={focused ? 22 : 21} color={focused ? "#FFFFFF" : color} />
    </View>
  );
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
            height: 72,
            paddingBottom: 10,
            paddingTop: 9,
            backgroundColor: "rgba(255,255,255,0.96)",
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: "rgba(46,125,91,0.10)",
            borderRadius: 28,
            shadowColor: "#0F172A",
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 10,
          },
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "900",
          },
          tabBarItemStyle: {
            paddingBottom: 1,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Panel",
            tabBarAccessibilityLabel: "Panel sekmesi",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: "Akış",
            tabBarAccessibilityLabel: "Akış sekmesi",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="leaf" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="share"
          options={{
            title: "Paylaş",
            tabBarAccessibilityLabel: "Paylaş sekmesi",
            tabBarActiveTintColor: AMBER,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="add-circle" color={color} focused={focused} tone="amber" />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Ara",
            tabBarAccessibilityLabel: "Ara sekmesi",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="search" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menü",
            tabBarAccessibilityLabel: "Menü sekmesi",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="grid" color={color} focused={focused} />
            ),
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

const styles = StyleSheet.create({
  tabIconShell: {
    width: 34,
    height: 28,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  tabIconAmber: {
    backgroundColor: AMBER,
    shadowColor: AMBER,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
});
