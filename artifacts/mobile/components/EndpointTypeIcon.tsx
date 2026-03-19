import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View, StyleSheet } from "react-native";
import { EndpointType } from "@/context/EndpointContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

const TYPE_COLORS: Record<EndpointType, string> = {
  websocket: "#00B4D8",
  mqtt: "#7B2FBE",
  rest: "#FF6B35",
  tcp: "#06D6A0",
  udp: "#FFB703",
};

export function EndpointTypeIcon({ type, size = 20 }: { type: EndpointType; size?: number }) {
  const color = TYPE_COLORS[type] ?? C.textSecondary;
  const bg = color + "22";

  const Icon = () => {
    if (type === "websocket") return <Feather name="zap" size={size - 4} color={color} />;
    if (type === "mqtt") return <MaterialCommunityIcons name="antenna" size={size - 2} color={color} />;
    if (type === "rest") return <Feather name="globe" size={size - 4} color={color} />;
    if (type === "tcp") return <MaterialCommunityIcons name="lan-connect" size={size - 2} color={color} />;
    if (type === "udp") return <MaterialCommunityIcons name="broadcast" size={size - 2} color={color} />;
    return <Feather name="server" size={size - 4} color={color} />;
  };

  return (
    <View style={[styles.container, { width: size + 10, height: size + 10, borderRadius: (size + 10) / 2, backgroundColor: bg }]}>
      <Icon />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
