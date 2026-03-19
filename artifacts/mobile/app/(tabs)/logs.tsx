import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useEndpoints } from "@/context/EndpointContext";
import { useStreaming } from "@/context/StreamingContext";

const C = Colors.dark;

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const { onDemandRequests, clearRequests, connectedClients, serverPort } = useStreaming();
  const { endpoints, totalSent } = useEndpoints();
  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const totalErrors = endpoints.filter((e) => e.lastStatus === "error").length;
  const totalMsgs = endpoints.reduce((acc, e) => acc + (e.messageCount ?? 0), 0);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient colors={["#0A0C0F", "#0A0C0F"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        <Text style={styles.pageTitle}>Logs & Status</Text>

        {/* Stats */}
        <Animated.View entering={FadeIn} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalSent}</Text>
            <Text style={styles.statLabel}>Broadcasts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalMsgs}</Text>
            <Text style={styles.statLabel}>Messages Sent</Text>
          </View>
          <View style={[styles.statCard, totalErrors > 0 && styles.statCardError]}>
            <Text style={[styles.statVal, totalErrors > 0 && { color: C.danger }]}>{totalErrors}</Text>
            <Text style={styles.statLabel}>Errors</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: C.tint }]}>{connectedClients}</Text>
            <Text style={styles.statLabel}>WS Clients</Text>
          </View>
        </Animated.View>

        {/* WebSocket Server Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On-Demand WebSocket Server</Text>
          <View style={styles.wsInfo}>
            <View style={styles.wsRow}>
              <Feather name="radio" size={14} color={C.tint} />
              <Text style={styles.wsLabel}>Listening Port</Text>
              <Text style={styles.wsVal}>{serverPort}</Text>
            </View>
            <View style={styles.wsDivider} />
            <View style={styles.wsRow}>
              <Feather name="users" size={14} color={C.textSecondary} />
              <Text style={styles.wsLabel}>Connected Clients</Text>
              <Text style={styles.wsVal}>{connectedClients}</Text>
            </View>
            <View style={styles.wsDivider} />
            <View style={styles.wsRow}>
              <Feather name="activity" size={14} color={C.textSecondary} />
              <Text style={styles.wsLabel}>On-Demand Requests</Text>
              <Text style={styles.wsVal}>{onDemandRequests.length}</Text>
            </View>
          </View>
          <View style={styles.apiCard}>
            <Text style={styles.apiTitle}>API Reference</Text>
            <View style={styles.apiRows}>
              {[
                { cmd: '{"type":"request_sensor"}', desc: "Request current sensor snapshot" },
                { cmd: '{"type":"request_image"}', desc: "Request a camera image capture" },
                { cmd: '{"type":"request_video","duration":5}', desc: "Request a 5-sec video clip" },
                { cmd: '{"type":"ping"}', desc: "Heartbeat / keep-alive" },
              ].map(({ cmd, desc }) => (
                <View key={cmd} style={styles.apiRow}>
                  <Text style={styles.apiCmd}>{cmd}</Text>
                  <Text style={styles.apiDesc}>{desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Endpoint Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endpoint Status</Text>
          {endpoints.length === 0 ? (
            <Text style={styles.emptyText}>No endpoints configured</Text>
          ) : (
            <View style={styles.epStatusList}>
              {endpoints.map((ep) => (
                <View key={ep.id} style={styles.epStatusRow}>
                  <View style={[styles.statusDot, { backgroundColor: epStatusColor(ep.lastStatus) }]} />
                  <View style={styles.epStatusInfo}>
                    <Text style={styles.epStatusName}>{ep.name}</Text>
                    <Text style={styles.epStatusUrl} numberOfLines={1}>{ep.url}</Text>
                  </View>
                  <Text style={styles.epMsgCount}>{ep.messageCount ?? 0}</Text>
                  {ep.lastError && (
                    <View style={styles.epErrorBadge}>
                      <Text style={styles.epErrorText} numberOfLines={1}>{ep.lastError}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* On-Demand Request Log */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>On-Demand Request Log</Text>
            {onDemandRequests.length > 0 && (
              <Pressable onPress={() => { Haptics.selectionAsync(); clearRequests(); }}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {onDemandRequests.length === 0 ? (
            <View style={styles.emptyHint}>
              <MaterialCommunityIcons name="inbox" size={28} color={C.textMuted} />
              <Text style={styles.emptyText}>No on-demand requests yet</Text>
            </View>
          ) : (
            <View style={styles.reqList}>
              {onDemandRequests.map((req) => (
                <View key={req.id} style={styles.reqRow}>
                  <View style={[styles.reqTypeIcon, { backgroundColor: reqTypeColor(req.type) + "20" }]}>
                    <MaterialCommunityIcons
                      name={req.type === "image" ? "camera" : req.type === "video" ? "video" : "code-json"}
                      size={14}
                      color={reqTypeColor(req.type)}
                    />
                  </View>
                  <View style={styles.reqInfo}>
                    <Text style={styles.reqType}>{req.type} request</Text>
                    <Text style={styles.reqMeta}>
                      from {req.clientId} • {new Date(req.timestamp).toISOString().split("T")[1].split(".")[0]}
                    </Text>
                  </View>
                  <View style={[styles.reqStatus, req.responded && styles.reqStatusDone]}>
                    <Text style={[styles.reqStatusText, req.responded && { color: C.success }]}>
                      {req.responded ? "Sent" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function epStatusColor(status?: string) {
  if (status === "connected") return Colors.dark.success;
  if (status === "error") return Colors.dark.danger;
  if (status === "sending") return Colors.dark.tint;
  if (status === "disconnected") return Colors.dark.warning;
  return Colors.dark.textMuted;
}

function reqTypeColor(type: string) {
  if (type === "image") return Colors.dark.tint;
  if (type === "video") return Colors.dark.danger;
  return Colors.dark.warning;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 16, gap: 20, paddingTop: 8 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.text, letterSpacing: -0.5 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  statCardError: { borderColor: C.danger + "40" },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text, letterSpacing: -0.5 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clearText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.danger },
  wsInfo: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
  },
  wsRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  wsDivider: { height: 1, backgroundColor: C.separator, marginHorizontal: 14 },
  wsLabel: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary },
  wsVal: { fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  apiCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  apiTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  apiRows: { gap: 8 },
  apiRow: { gap: 3 },
  apiCmd: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.tint, fontStyle: "italic" },
  apiDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  epStatusList: { gap: 8 },
  epStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  epStatusInfo: { flex: 1 },
  epStatusName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },
  epStatusUrl: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary },
  epMsgCount: { fontFamily: "Inter_700Bold", fontSize: 14, color: C.textSecondary },
  epErrorBadge: {
    backgroundColor: C.danger + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 80,
  },
  epErrorText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.danger },
  reqList: { gap: 8 },
  reqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  reqTypeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  reqInfo: { flex: 1 },
  reqType: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },
  reqMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary },
  reqStatus: {
    backgroundColor: C.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  reqStatusDone: { backgroundColor: C.success + "15", borderColor: C.success + "30" },
  reqStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.textMuted },
  emptyHint: { alignItems: "center", paddingVertical: 28, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted, fontStyle: "italic" },
});
