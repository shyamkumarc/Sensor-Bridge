import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

const C = Colors.dark;

export function PulseIndicator({ active, color = C.tint, size = 10 }: { active: boolean; color?: string; size?: number }) {
  const scale = useSharedValue(1);
  const outerOpacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.4, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1
      );
      outerOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 600 }), withTiming(0, { duration: 600 })),
        -1
      );
    } else {
      scale.value = 1;
      outerOpacity.value = 0;
    }
  }, [active]);

  const innerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const outerStyle = useAnimatedStyle(() => ({ opacity: outerOpacity.value, transform: [{ scale: scale.value }] }));

  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          styles.outer,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color + "33",
          },
          outerStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: active ? color : C.textMuted,
          },
          innerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
  },
  inner: {
    position: "absolute",
  },
});
