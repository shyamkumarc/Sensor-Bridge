import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { SensorData } from "@/context/SensorContext";

const C = Colors.dark;

type LogEntry = { id: string; ts: string; payload: string };

export function DataStream({ data, maxEntries = 20 }: { data: SensorData | null; maxEntries?: number }) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!data) return;
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      ts: new Date(data.timestamp).toISOString().split("T")[1].split(".")[0],
      payload: JSON.stringify(data, null, 0).slice(0, 200),
    };
    setLog((prev) => [entry, ...prev].slice(0, maxEntries));
  }, [data?.timestamp]);

  if (log.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Start collection to see data stream</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {log.map((entry, i) => (
        <View key={entry.id} style={[styles.line, i === 0 && styles.lineFirst]}>
          <Text style={styles.ts}>{entry.ts}</Text>
          <Text style={styles.payload} numberOfLines={1}>
            {entry.payload}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 4,
    paddingBottom: 8,
  },
  line: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: C.backgroundSecondary,
  },
  lineFirst: {
    backgroundColor: C.tint + "18",
  },
  ts: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.tint,
    minWidth: 60,
  },
  payload: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.textSecondary,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.textMuted,
    fontStyle: "italic",
  },
});
