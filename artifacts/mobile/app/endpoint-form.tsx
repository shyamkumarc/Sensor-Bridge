import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { Endpoint, EndpointType, useEndpoints } from "@/context/EndpointContext";

const C = Colors.dark;

const TYPE_OPTIONS: { value: EndpointType; label: string; placeholder: string; hint: string }[] = [
  {
    value: "websocket",
    label: "WebSocket",
    placeholder: "ws://your-server:8080/data",
    hint: "Real-time bidirectional streaming. Supports ws:// and wss://",
  },
  {
    value: "mqtt",
    label: "MQTT (over WS)",
    placeholder: "ws://broker.hivemq.com:8000",
    hint: "MQTT over WebSocket. Use mqtt:// or mqtts:// and they'll auto-convert.",
  },
  {
    value: "rest",
    label: "REST / HTTP",
    placeholder: "https://api.example.com/sensor-data",
    hint: "POST/PUT JSON to any REST endpoint or webhook URL.",
  },
  {
    value: "tcp",
    label: "TCP Bridge",
    placeholder: "http://proxy:8080/tcp-forward",
    hint: "HTTP proxy endpoint that bridges to TCP. Used with industrial gateways.",
  },
  {
    value: "udp",
    label: "UDP Bridge",
    placeholder: "http://proxy:8080/udp-forward",
    hint: "HTTP proxy endpoint that bridges to UDP. Common in industrial protocols.",
  },
];

const HTTP_METHODS: Array<Endpoint["method"]> = ["POST", "PUT", "PATCH"];

function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "none",
  secureTextEntry,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "url" | "numeric";
}) {
  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{label}</Text>
      <TextInput
        style={[inputStyles.input, multiline && inputStyles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textSecondary },
  input: {
    backgroundColor: C.backgroundTertiary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  multiline: { height: 80, textAlignVertical: "top", paddingTop: 10 },
});

export default function EndpointFormScreen() {
  const insets = useSafeAreaInsets();
  const { addEndpoint } = useEndpoints();

  const [name, setName] = useState("");
  const [type, setType] = useState<EndpointType>("websocket");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<Endpoint["method"]>("POST");
  const [topic, setTopic] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [payloadTemplate, setPayloadTemplate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedTypeOption = TYPE_OPTIONS.find((t) => t.value === type)!;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!url.trim()) errs.url = "URL is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addEndpoint({
      name: name.trim(),
      type,
      url: url.trim(),
      enabled: true,
      method: type === "rest" ? method : undefined,
      topic: topic.trim() || undefined,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      payloadTemplate: payloadTemplate.trim() || undefined,
      lastStatus: "idle",
      messageCount: 0,
    });
    router.back();
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.title}>New Endpoint</Text>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          {/* Type Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Protocol</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.typeChip, type === opt.value && styles.typeChipActive]}
                  onPress={() => { setType(opt.value); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.typeChipText, type === opt.value && styles.typeChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.typeHint}>
              <Feather name="info" size={12} color={C.textMuted} />
              <Text style={styles.typeHintText}>{selectedTypeOption.hint}</Text>
            </View>
          </View>

          {/* Basic Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connection</Text>
            <View style={styles.fields}>
              <InputRow label="Name" value={name} onChangeText={setName} placeholder="My IoT Server" autoCapitalize="words" />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              <InputRow label="URL" value={url} onChangeText={setUrl} placeholder={selectedTypeOption.placeholder} keyboardType="url" />
              {errors.url && <Text style={styles.errorText}>{errors.url}</Text>}
              {type === "mqtt" && (
                <InputRow label="Topic" value={topic} onChangeText={setTopic} placeholder="sensors/device-1/data" />
              )}
              {type === "rest" && (
                <View style={inputStyles.wrapper}>
                  <Text style={inputStyles.label}>HTTP Method</Text>
                  <View style={styles.methodRow}>
                    {HTTP_METHODS.map((m) => (
                      <Pressable
                        key={m}
                        style={[styles.methodChip, method === m && styles.methodChipActive]}
                        onPress={() => setMethod(m)}
                      >
                        <Text style={[styles.methodChipText, method === m && styles.methodChipTextActive]}>{m}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Auth */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authentication (Optional)</Text>
            <View style={styles.fields}>
              <InputRow label="Username / API Key" value={username} onChangeText={setUsername} placeholder="username" />
              <InputRow label="Password / Token" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            </View>
          </View>

          {/* Payload Template */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payload Template (Optional)</Text>
            <View style={styles.fields}>
              <InputRow
                label="Template"
                value={payloadTemplate}
                onChangeText={setPayloadTemplate}
                placeholder={'{"device":"sensor-1","data":{{data}},"ts":{{timestamp}}'}
                multiline
              />
              <Text style={styles.templateHint}>
                Use {"{{data}}"} for the full sensor JSON and {"{{timestamp}}"} for Unix ms. Leave blank to send raw JSON.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.separator,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  saveBtn: {
    backgroundColor: C.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: C.background,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 24 },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  typeRow: { gap: 8, paddingVertical: 2 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  typeChipActive: {
    backgroundColor: C.tint + "20",
    borderColor: C.tint,
  },
  typeChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: C.textSecondary,
  },
  typeChipTextActive: { color: C.tint },
  typeHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    padding: 10,
  },
  typeHintText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17,
  },
  fields: { gap: 14 },
  methodRow: { flexDirection: "row", gap: 8 },
  methodChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  methodChipActive: {
    backgroundColor: C.tint + "20",
    borderColor: C.tint,
  },
  methodChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.textSecondary,
  },
  methodChipTextActive: { color: C.tint },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.danger,
    marginTop: -8,
  },
  templateHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17,
    fontStyle: "italic",
  },
});
