import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SensorCard } from "@/components/SensorCard";
import { SensorToggle } from "@/components/SensorToggle";
import Colors from "@/constants/colors";
import { useSensor } from "@/context/SensorContext";

const C = Colors.dark;

function fmt(n: number | null | undefined, decimals = 3): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

const ALL_SENSORS = [
  { key: "accelerometer", icon: "axis-arrow", label: "Accelerometer", available: true },
  { key: "gyroscope", icon: "axis-z-rotate-counterclockwise", label: "Gyroscope", available: true },
  { key: "magnetometer", icon: "compass", label: "Magnetometer", available: true },
  { key: "barometer", icon: "gauge", label: "Barometer", available: Platform.OS !== "web" },
  { key: "location", icon: "map-marker-radius", label: "GPS / Location", available: true },
  { key: "battery", icon: "battery-charging", label: "Battery", available: true },
  { key: "network", icon: "wifi", label: "Network Info", available: true },
  { key: "lightSensor", icon: "brightness-5", label: "Light Sensor", available: Platform.OS === "android" },
  { key: "pedometer", icon: "walk", label: "Pedometer", available: Platform.OS !== "web" },
];

const INTERVALS = [
  { label: "100ms", value: 100 },
  { label: "250ms", value: 250 },
  { label: "500ms", value: 500 },
  { label: "1s", value: 1000 },
  { label: "2s", value: 2000 },
  { label: "5s", value: 5000 },
];

export default function SensorsScreen() {
  const insets = useSafeAreaInsets();
  const { sensorData, activeSensors, toggleSensor, updateInterval, setUpdateInterval, isCollecting, permissionsGranted } = useSensor();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient colors={["#0A0C0F", "#0A0C0F"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        <Text style={styles.pageTitle}>Sensors</Text>

        {/* Sample Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Rate</Text>
          <View style={styles.intervalRow}>
            {INTERVALS.map((iv) => (
              <View
                key={iv.value}
                style={[
                  styles.intervalChip,
                  updateInterval === iv.value && styles.intervalChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.intervalChipText,
                    updateInterval === iv.value && styles.intervalChipTextActive,
                  ]}
                  onPress={() => setUpdateInterval(iv.value)}
                >
                  {iv.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sensor Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Sensors</Text>
          <View style={styles.toggleList}>
            {ALL_SENSORS.map((s) => (
              <SensorToggle
                key={s.key}
                icon={s.icon}
                label={s.label}
                enabled={activeSensors.has(s.key)}
                onToggle={() => toggleSensor(s.key)}
                disabled={!s.available}
              />
            ))}
          </View>
          {!permissionsGranted.location && (
            <View style={styles.permissionBanner}>
              <Feather name="alert-triangle" size={14} color={C.warning} />
              <Text style={styles.permissionText}>
                Location permission not granted. GPS data will be unavailable.
              </Text>
            </View>
          )}
        </View>

        {/* Live Values */}
        {isCollecting && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Values</Text>
            <View style={styles.liveGrid}>
              {sensorData.accelerometer && (
                <>
                  <SensorCard icon="axis-arrow" label="Accel X" value={fmt(sensorData.accelerometer.x)} unit="m/s²" small />
                  <SensorCard icon="axis-arrow" label="Accel Y" value={fmt(sensorData.accelerometer.y)} unit="m/s²" small />
                  <SensorCard icon="axis-arrow" label="Accel Z" value={fmt(sensorData.accelerometer.z)} unit="m/s²" small />
                </>
              )}
              {sensorData.gyroscope && (
                <>
                  <SensorCard icon="axis-z-rotate-counterclockwise" label="Gyro X" value={fmt(sensorData.gyroscope.x)} unit="°/s" small />
                  <SensorCard icon="axis-z-rotate-counterclockwise" label="Gyro Y" value={fmt(sensorData.gyroscope.y)} unit="°/s" small />
                  <SensorCard icon="axis-z-rotate-counterclockwise" label="Gyro Z" value={fmt(sensorData.gyroscope.z)} unit="°/s" small />
                </>
              )}
              {sensorData.magnetometer && (
                <>
                  <SensorCard icon="compass" label="Mag X" value={fmt(sensorData.magnetometer.x)} unit="µT" small />
                  <SensorCard icon="compass" label="Mag Y" value={fmt(sensorData.magnetometer.y)} unit="µT" small />
                  <SensorCard icon="compass" label="Mag Z" value={fmt(sensorData.magnetometer.z)} unit="µT" small />
                </>
              )}
              {sensorData.barometer && (
                <SensorCard icon="gauge" label="Pressure" value={fmt(sensorData.barometer.pressure, 1)} unit="hPa" small />
              )}
              {sensorData.location && (
                <>
                  <SensorCard icon="crosshairs-gps" label="Latitude" value={fmt(sensorData.location.latitude, 5)} unit="°" small />
                  <SensorCard icon="crosshairs-gps" label="Longitude" value={fmt(sensorData.location.longitude, 5)} unit="°" small />
                  <SensorCard icon="arrow-up" label="Speed" value={fmt(sensorData.location.speed, 1)} unit="m/s" small />
                </>
              )}
              {sensorData.battery && (
                <>
                  <SensorCard icon="battery-charging" label="Battery" value={`${sensorData.battery.level}%`} small />
                  <SensorCard icon="battery-charging" label="State" value={sensorData.battery.state} small />
                </>
              )}
              {sensorData.network && (
                <>
                  <SensorCard icon="wifi" label="Network" value={sensorData.network.type} small />
                  <SensorCard icon="wifi" label="Internet" value={sensorData.network.isInternetReachable ? "Yes" : "No"} small />
                </>
              )}
              {sensorData.lightSensor && (
                <SensorCard icon="brightness-5" label="Illuminance" value={fmt(sensorData.lightSensor.illuminance, 0)} unit="lux" small />
              )}
              {sensorData.pedometer && (
                <SensorCard icon="walk" label="Steps" value={String(sensorData.pedometer.steps)} small />
              )}
            </View>
          </View>
        )}

        {!isCollecting && (
          <View style={styles.idleHint}>
            <MaterialCommunityIcons name="antenna" size={32} color={C.textMuted} />
            <Text style={styles.idleText}>Go to Dashboard to start collection</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 16, gap: 8, paddingTop: 8 },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  intervalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intervalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  intervalChipActive: {
    backgroundColor: C.tint + "20",
    borderColor: C.tint,
  },
  intervalChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.textSecondary,
  },
  intervalChipTextActive: {
    color: C.tint,
  },
  toggleList: { gap: 8 },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.warning + "15",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.warning + "30",
  },
  permissionText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.warning,
  },
  liveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  idleHint: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  idleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.textMuted,
    fontStyle: "italic",
  },
});
