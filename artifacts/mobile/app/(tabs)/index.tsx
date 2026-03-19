import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DataStream } from "@/components/DataStream";
import { PulseIndicator } from "@/components/PulseIndicator";
import { SensorCard } from "@/components/SensorCard";
import Colors from "@/constants/colors";
import { useEndpoints } from "@/context/EndpointContext";
import { useSensor } from "@/context/SensorContext";
import { useStreaming } from "@/context/StreamingContext";

const C = Colors.dark;

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { sensorData, isCollecting, startCollection, stopCollection, updateInterval } = useSensor();
  const { endpoints, totalSent, sendToEndpoints } = useEndpoints();
  const { connectedClients, serverPort, broadcastSensorData } = useStreaming();

  const btnScale = useSharedValue(1);
  const dispatchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestSensorRef = useRef(sensorData);

  const activeEndpoints = endpoints.filter((e) => e.enabled).length;

  // Always keep the latest sensor data available to the interval without re-triggering it
  useEffect(() => { latestSensorRef.current = sensorData; }, [sensorData]);

  // Restart dispatch loop whenever collection state, interval, or endpoints change
  useEffect(() => {
    if (dispatchTimer.current) {
      clearInterval(dispatchTimer.current);
      dispatchTimer.current = null;
    }
    if (isCollecting) {
      // Send immediately on start
      broadcastSensorData(latestSensorRef.current);
      sendToEndpoints(latestSensorRef.current);

      // Then repeat on the configured sample interval
      dispatchTimer.current = setInterval(() => {
        broadcastSensorData(latestSensorRef.current);
        sendToEndpoints(latestSensorRef.current);
      }, updateInterval);
    }
    return () => {
      if (dispatchTimer.current) {
        clearInterval(dispatchTimer.current);
        dispatchTimer.current = null;
      }
    };
  // sendToEndpoints and broadcastSensorData are stable refs — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollecting, updateInterval]);

  const toggleCollection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    btnScale.value = withSpring(0.94, {}, () => { btnScale.value = withSpring(1); });
    if (isCollecting) stopCollection();
    else startCollection();
  };

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["#0A0C0F", "#0D1117", "#0A0C0F"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>IoT Sensor Hub</Text>
            <Text style={styles.headerSub}>
              {activeEndpoints} endpoint{activeEndpoints !== 1 ? "s" : ""} active
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.pill}>
              <PulseIndicator active={connectedClients > 0} color={C.tint} size={6} />
              <Text style={styles.pillText}>{connectedClients} clients</Text>
            </View>
          </View>
        </View>

        {/* Main Control */}
        <Animated.View style={[styles.controlCard, btnStyle]}>
          <LinearGradient
            colors={isCollecting ? [C.tint + "22", C.tint + "08"] : [C.card, C.backgroundSecondary]}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          <View style={styles.controlTop}>
            <PulseIndicator active={isCollecting} color={C.tint} size={14} />
            <View style={styles.controlInfo}>
              <Text style={styles.controlStatus}>
                {isCollecting ? "Collecting" : "Idle"}
              </Text>
              <Text style={styles.controlSub}>
                {isCollecting ? `Streaming to ${activeEndpoints} endpoint${activeEndpoints !== 1 ? "s" : ""}` : "Tap to start data collection"}
              </Text>
            </View>
            <View style={styles.statsGroup}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{totalSent}</Text>
                <Text style={styles.statLabel}>Sent</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{connectedClients}</Text>
                <Text style={styles.statLabel}>WS</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              isCollecting ? styles.controlBtnStop : styles.controlBtnStart,
              pressed && { opacity: 0.85 },
            ]}
            onPress={toggleCollection}
          >
            <MaterialCommunityIcons
              name={isCollecting ? "stop" : "play"}
              size={18}
              color={isCollecting ? C.danger : C.background}
            />
            <Text
              style={[
                styles.controlBtnText,
                { color: isCollecting ? C.danger : C.background },
              ]}
            >
              {isCollecting ? "Stop Collection" : "Start Collection"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Sensor Grid */}
        <Animated.View entering={FadeIn.delay(100)}>
          <Text style={styles.sectionTitle}>Live Readings</Text>
          <View style={styles.grid}>
            <SensorCard
              icon="axis-arrow"
              label="Accel X"
              value={fmt(sensorData.accelerometer?.x)}
              unit="m/s²"
              active={isCollecting && !!sensorData.accelerometer}
            />
            <SensorCard
              icon="axis-z-rotate-counterclockwise"
              label="Gyro Z"
              value={fmt(sensorData.gyroscope?.z)}
              unit="°/s"
              active={isCollecting && !!sensorData.gyroscope}
            />
            <SensorCard
              icon="map-marker-radius"
              label="Location"
              value={sensorData.location ? `${fmt(sensorData.location.latitude, 4)}°` : "—"}
              active={isCollecting && !!sensorData.location}
            />
            <SensorCard
              icon="battery-charging"
              label="Battery"
              value={sensorData.battery ? `${sensorData.battery.level}%` : "—"}
              active={isCollecting && !!sensorData.battery}
            />
            <SensorCard
              icon="wifi"
              label="Network"
              value={sensorData.network?.type ?? "—"}
              active={isCollecting && !!sensorData.network}
            />
            <SensorCard
              icon="gauge"
              label="Pressure"
              value={fmt(sensorData.barometer?.pressure)}
              unit="hPa"
              active={isCollecting && !!sensorData.barometer}
            />
          </View>
        </Animated.View>

        {/* On-Demand Server Info */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.serverCard}>
          <View style={styles.serverHeader}>
            <Feather name="radio" size={16} color={C.tint} />
            <Text style={styles.serverTitle}>On-Demand Server</Text>
            <View style={styles.serverBadge}>
              <Text style={styles.serverBadgeText}>:{serverPort}</Text>
            </View>
          </View>
          <Text style={styles.serverDesc}>
            External clients can connect via WebSocket on port {serverPort} to request sensor data, camera images, and video clips on demand.
          </Text>
          <View style={styles.serverActions}>
            <View style={styles.serverAction}>
              <MaterialCommunityIcons name="code-json" size={14} color={C.textSecondary} />
              <Text style={styles.serverActionText}>
                {"{ \"type\": \"request_sensor\" }"}
              </Text>
            </View>
            <View style={styles.serverAction}>
              <MaterialCommunityIcons name="camera" size={14} color={C.textSecondary} />
              <Text style={styles.serverActionText}>
                {"{ \"type\": \"request_image\" }"}
              </Text>
            </View>
            <View style={styles.serverAction}>
              <MaterialCommunityIcons name="video" size={14} color={C.textSecondary} />
              <Text style={styles.serverActionText}>
                {"{ \"type\": \"request_video\", \"duration\": 5 }"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Data Stream Log */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Feather name="activity" size={14} color={C.tint} />
            <Text style={styles.sectionTitle}>Data Stream</Text>
          </View>
          <View style={styles.logBody}>
            <DataStream data={isCollecting ? sensorData : null} maxEntries={15} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.textSecondary,
  },
  controlCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 16,
    overflow: "hidden",
  },
  controlTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  controlInfo: {
    flex: 1,
    gap: 3,
  },
  controlStatus: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.3,
  },
  controlSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.textSecondary,
  },
  statsGroup: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    alignItems: "center",
    gap: 2,
  },
  statVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.textMuted,
    textTransform: "uppercase",
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  controlBtnStart: {
    backgroundColor: C.tint,
  },
  controlBtnStop: {
    backgroundColor: C.danger + "18",
    borderWidth: 1,
    borderColor: C.danger + "40",
  },
  controlBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serverCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.tint + "30",
    gap: 12,
  },
  serverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serverTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.text,
    flex: 1,
  },
  serverBadge: {
    backgroundColor: C.tint + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serverBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: C.tint,
  },
  serverDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
  },
  serverActions: {
    gap: 6,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
  },
  serverAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serverActionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.textMuted,
    fontStyle: "italic",
  },
  logCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    minHeight: 200,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  logBody: {
    minHeight: 160,
  },
});
