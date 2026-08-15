import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  community: "people",
  matches: "football",
  messages: "chatbubble-ellipses",
  profile: "person-circle",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#DA291C",
        tabBarInactiveTintColor: "#A1A1A1",
        tabBarStyle: {
          backgroundColor: "#0A0A0A",
          borderTopColor: "rgba(255,255,255,0.08)",
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name] ?? "ellipse"} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
