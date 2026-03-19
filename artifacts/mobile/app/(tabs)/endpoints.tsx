import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EndpointTypeIcon } from "@/components/EndpointTypeIcon";
import { StatusBadge } from "@/components/StatusBadge";
import Colors from "@/constants/colors";
import { Endpoint, useEndpoints } from "@/context/EndpointContext";

const C = Colors.dark;

const TYPE_LABELS = {
  websocket: "WebSocket",
  mqtt: "MQTT",
  rest: "REST HTTP",
  tcp: "TCP / HTTP Bridge",
  udp: "UDP / HTTP Bridge",
};

function EndpointRow({ ep, index }: { ep: Endpoint; index: number }) {
  const { removeEndpoint, updateEndpoint } = useEndpoints();

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Endpoint", `Remove "${ep.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeEndpoint(ep.id),
      },
    ]);
  };

  const handleToggle = () => {
    Haptics.selectionAsync();
    updateEndpoint(ep.id, { enabled: !ep.enabled });
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View style={styles.epCard}>
        <View style={styles.epRow}>
          <EndpointTypeIcon type={ep.type} size={24} />
          <View style={styles.epInfo}>
            <Text style={styles.epName} numberOfLines={1}>{ep.name}</Text>
            <Text style={styles.epUrl} numberOfLines={1}>{ep.url}</Text>
            <View style={styles.epMeta}>
              <Text style={styles.epTypeLabel}>{TYPE_LABELS[ep.type]}</Text>
              {ep.topic && <Text style={styles.epTopic}>• {ep.topic}</Text>}
            </View>
          </View>
          <View style={styles.epActions}>
            <Pressable
              style={[styles.epToggle, ep.enabled && styles.epToggleOn]}
              onPress={handleToggle}
            >
              <Feather name={ep.enabled ? "check" : "slash"} size={14} color={ep.enabled ? C.tint : C.textMuted} />
            </Pressable>
          </View>
        </View>
        <View style={styles.epFooter}>
          <StatusBadge status={ep.lastStatus ?? "idle"} />
          <Text style={styles.epMsgCount}>{ep.messageCount ?? 0} msgs</Text>
          <View style={styles.epFooterSpacer} />
          {ep.lastError && (
            <Text style={styles.epError} numberOfLines={1}>{ep.lastError}</Text>
          )}
          <Pressable onPress={handleDelete}>
            <Feather name="trash-2" size={14} color={C.danger} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function EndpointsScreen() {
  const insets = useSafeAreaInsets();
  const { endpoints } = useEndpoints();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/endpoint-form");
  };

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient colors={["#0A0C0F", "#0A0C0F"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Endpoints</Text>
            <Text style={styles.pageSub}>
              {endpoints.length} configured
            </Text>
          </View>
          <Pressable style={styles.addBtn} onPress={handleAdd}>
            <Feather name="plus" size={20} color={C.background} />
          </Pressable>
        </View>

        {/* Protocol Guide */}
        <View style={styles.protoCard}>
          <Text style={styles.protoTitle}>Supported Protocols</Text>
          <View style={styles.protoList}>
            {[
              { type: "websocket" as const, desc: "Real-time bidirectional — ideal for low-latency IoT dashboards" },
              { type: "mqtt" as const, desc: "Pub/Sub broker — industry standard for IoT messaging (MQTT over WS)" },
              { type: "rest" as const, desc: "HTTP POST/PUT — compatible with any REST API or webhook" },
              { type: "tcp" as const, desc: "TCP bridge via HTTP proxy endpoint" },
              { type: "udp" as const, desc: "UDP bridge via HTTP proxy endpoint" },
            ].map(({ type, desc }) => (
              <View key={type} style={styles.protoRow}>
                <EndpointTypeIcon type={type} size={20} />
                <View style={styles.protoInfo}>
                  <Text style={styles.protoType}>{TYPE_LABELS[type]}</Text>
                  <Text style={styles.protoDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {endpoints.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="server" size={36} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No Endpoints</Text>
            <Text style={styles.emptyDesc}>
              Add an endpoint to start forwarding sensor data to your IoT infrastructure.
            </Text>
            <Pressable style={styles.emptyBtn} onPress={handleAdd}>
              <Feather name="plus" size={16} color={C.background} />
              <Text style={styles.emptyBtnText}>Add Endpoint</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {endpoints.map((ep, i) => (
              <EndpointRow key={ep.id} ep={ep} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 16, gap: 16, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: C.text,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  protoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 12,
  },
  protoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  protoList: { gap: 10 },
  protoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  protoInfo: { flex: 1 },
  protoType: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.text },
  protoDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary, marginTop: 2 },
  list: { gap: 10 },
  epCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 12,
  },
  epRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  epInfo: { flex: 1, gap: 3 },
  epName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.text },
  epUrl: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary },
  epMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  epTypeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: C.textMuted,
    backgroundColor: C.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epTopic: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  epActions: { gap: 8 },
  epToggle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  epToggleOn: {
    backgroundColor: C.tint + "18",
    borderColor: C.tint + "40",
  },
  epFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  epMsgCount: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.textMuted },
  epFooterSpacer: { flex: 1 },
  epError: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: C.danger },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text },
  emptyDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.background },
});
