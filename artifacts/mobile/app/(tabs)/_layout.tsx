import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

const C = Colors.dark;

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "antenna.radiowaves.left.and.right", selected: "antenna.radiowaves.left.and.right" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sensors">
        <Icon sf={{ default: "cpu", selected: "cpu.fill" }} />
        <Label>Sensors</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="endpoints">
        <Icon sf={{ default: "network", selected: "network" }} />
        <Label>Endpoints</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="camera">
        <Icon sf={{ default: "camera", selected: "camera.fill" }} />
        <Label>Camera</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="logs">
        <Icon sf={{ default: "list.bullet.rectangle", selected: "list.bullet.rectangle.fill" }} />
        <Label>Logs</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = true;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.background,
          borderTopWidth: 1,
          borderTopColor: C.separator,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="antenna.radiowaves.left.and.right" tintColor={color} size={22} />
            ) : (
              <MaterialCommunityIcons name="antenna" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: "Sensors",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="cpu" tintColor={color} size={22} />
            ) : (
              <MaterialCommunityIcons name="chip" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="endpoints"
        options={{
          title: "Endpoints",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="network" tintColor={color} size={22} />
            ) : (
              <MaterialCommunityIcons name="server-network" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="camera" tintColor={color} size={22} />
            ) : (
              <Feather name="camera" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "Logs",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet.rectangle" tintColor={color} size={22} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
