import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

const C = Colors.dark;

type Status = "connected" | "disconnected" | "error" | "sending" | "idle";

const STATUS_COLORS: Record<Status, string> = {
  connected: C.success,
  sending: C.tint,
  idle: C.textMuted,
  disconnected: C.warning,
  error: C.danger,
};

const STATUS_LABELS: Record<Status, string> = {
  connected: "Connected",
  sending: "Sending",
  idle: "Idle",
  disconnected: "Disconnected",
  error: "Error",
};

export function StatusBadge({ status }: { status: Status }) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (status === "sending" || status === "connected") {
      opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      opacity.value = 1;
    }
  }, [status]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const color = STATUS_COLORS[status] ?? C.textMuted;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
      <Text style={[styles.label, { color }]}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
