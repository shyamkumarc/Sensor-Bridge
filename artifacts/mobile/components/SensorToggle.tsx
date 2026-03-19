import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

const C = Colors.dark;

type SensorToggleProps = {
  icon: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export function SensorToggle({ icon, label, enabled, onToggle, disabled }: SensorToggleProps) {
  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    onToggle();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        enabled && styles.rowActive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconWrap, enabled && styles.iconWrapActive]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={enabled ? C.tint : C.textMuted}
        />
      </View>
      <Text style={[styles.label, enabled && styles.labelActive]}>{label}</Text>
      <View style={[styles.toggle, enabled && styles.toggleOn]}>
        <View style={[styles.thumb, enabled && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  rowActive: {
    borderColor: C.tint + "40",
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: C.tint + "18",
  },
  label: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: C.textSecondary,
  },
  labelActive: {
    color: C.text,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.backgroundTertiary,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  toggleOn: {
    backgroundColor: C.tint,
    borderColor: C.tint,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.textMuted,
  },
  thumbOn: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },
});
