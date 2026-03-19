import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";

const C = Colors.dark;

type SensorCardProps = {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  active?: boolean;
  small?: boolean;
};

export function SensorCard({ icon, label, value, unit, active = true, small }: SensorCardProps) {
  return (
    <View style={[styles.card, small && styles.cardSmall, !active && styles.cardInactive]}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={icon as any}
          size={small ? 16 : 18}
          color={active ? C.tint : C.textMuted}
        />
        <Text style={[styles.label, small && styles.labelSmall, !active && styles.inactive]}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.value, small && styles.valueSmall, !active && styles.inactive]}
        numberOfLines={1}
      >
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 6,
    flex: 1,
    minWidth: "45%",
  },
  cardSmall: {
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  cardInactive: {
    opacity: 0.45,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 10,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.5,
  },
  valueSmall: {
    fontSize: 14,
  },
  unit: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.textSecondary,
  },
  inactive: {
    color: C.textMuted,
  },
});
