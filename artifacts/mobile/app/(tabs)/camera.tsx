import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useStreaming } from "@/context/StreamingContext";

const C = Colors.dark;

type CapturedItem = {
  id: string;
  type: "image" | "video";
  uri: string;
  timestamp: number;
  sentToEndpoints?: boolean;
};

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const { onDemandRequests } = useStreaming();
  const cameraRef = useRef<CameraView>(null);

  const btnScale = useSharedValue(1);

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top;

  if (!permission) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <ActivityIndicator color={C.tint} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: topPad }]}>
        <MaterialCommunityIcons name="camera-off" size={48} color={C.textMuted} />
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permDesc}>
          The app needs camera access to capture images and video for on-demand requests.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);
    btnScale.value = withSequence(withTiming(0.85, { duration: 80 }), withTiming(1, { duration: 120 }));
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (photo) {
        const item: CapturedItem = {
          id: Date.now().toString(),
          type: "image",
          uri: photo.uri,
          timestamp: Date.now(),
        };
        setCapturedItems((prev) => [item, ...prev].slice(0, 20));
      }
    } catch (e) {
      console.error("Photo capture error:", e);
    } finally {
      setIsCapturing(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 10 });
      if (video) {
        const item: CapturedItem = {
          id: Date.now().toString(),
          type: "video",
          uri: video.uri,
          timestamp: Date.now(),
        };
        setCapturedItems((prev) => [item, ...prev].slice(0, 20));
      }
    } catch {}
    setIsRecording(false);
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const pendingRequests = onDemandRequests.filter((r) => !r.responded);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient colors={["#0A0C0F", "#0A0C0F"]} style={StyleSheet.absoluteFill} />

      <Text style={styles.pageTitle}>Camera</Text>
      <Text style={styles.pageSub}>Capture images & video for on-demand requests</Text>

      {/* Camera Viewport */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode={mode}
        >
          <View style={styles.cameraOverlay}>
            <Pressable
              style={styles.flipBtn}
              onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            >
              <MaterialCommunityIcons name="camera-flip" size={22} color="#fff" />
            </Pressable>
          </View>
        </CameraView>

        {/* Mode + Capture Controls */}
        <View style={styles.controls}>
          <View style={styles.modeRow}>
            {(["photo", "video"] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.modeChip, mode === m && styles.modeChipActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                  {m === "photo" ? "Photo" : "Video"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Animated.View style={[styles.captureWrap, btnAnimStyle]}>
            <Pressable
              style={[
                styles.captureBtn,
                mode === "video" && isRecording && styles.captureBtnRecording,
              ]}
              onPress={
                mode === "photo"
                  ? capturePhoto
                  : isRecording
                  ? stopRecording
                  : startRecording
              }
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color={C.background} size="small" />
              ) : mode === "video" && isRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <View style={styles.captureInner} />
              )}
            </Pressable>
          </Animated.View>

          {isRecording && (
            <View style={styles.recIndicator}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC</Text>
            </View>
          )}
        </View>
      </View>

      {/* On-Demand Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.requestBanner}>
          <Feather name="radio" size={14} color={C.tint} />
          <Text style={styles.requestText}>
            {pendingRequests.length} on-demand request{pendingRequests.length > 1 ? "s" : ""} pending
          </Text>
          <View style={styles.requestTypes}>
            {pendingRequests.map((r) => (
              <View key={r.id} style={styles.requestChip}>
                <Text style={styles.requestChipText}>{r.type}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Captured Items */}
      {capturedItems.length > 0 && (
        <View style={styles.capturedSection}>
          <Text style={styles.capturedTitle}>Captured ({capturedItems.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capturedRow}>
            {capturedItems.map((item) => (
              <View key={item.id} style={styles.capturedThumb}>
                <View style={[styles.capturedTypeIcon, { backgroundColor: item.type === "video" ? C.danger + "30" : C.tint + "30" }]}>
                  <MaterialCommunityIcons
                    name={item.type === "video" ? "video" : "image"}
                    size={20}
                    color={item.type === "video" ? C.danger : C.tint}
                  />
                </View>
                <Text style={styles.capturedTime}>
                  {new Date(item.timestamp).toISOString().split("T")[1].split(".")[0]}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background, paddingHorizontal: 16 },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text, letterSpacing: -0.5, marginTop: 8 },
  pageSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textSecondary, marginTop: 2, marginBottom: 12 },
  cameraContainer: { borderRadius: 20, overflow: "hidden", backgroundColor: C.card },
  camera: { width: "100%", aspectRatio: 4 / 3 },
  cameraOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  flipBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.backgroundSecondary,
  },
  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  modeChipActive: { backgroundColor: C.tint + "20", borderColor: C.tint },
  modeChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textSecondary },
  modeChipTextActive: { color: C.tint },
  captureWrap: {},
  captureBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: C.textMuted,
  },
  captureBtnRecording: { backgroundColor: C.danger, borderColor: C.danger },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", borderWidth: 2, borderColor: C.backgroundTertiary },
  stopIcon: { width: 22, height: 22, borderRadius: 4, backgroundColor: "#fff" },
  recIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  recText: { fontFamily: "Inter_700Bold", fontSize: 12, color: C.danger, letterSpacing: 1 },
  requestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.tint + "15",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.tint + "30",
    marginTop: 12,
    flexWrap: "wrap",
  },
  requestText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.tint, flex: 1 },
  requestTypes: { flexDirection: "row", gap: 6 },
  requestChip: {
    backgroundColor: C.tint + "30",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requestChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.tint },
  capturedSection: { marginTop: 16, gap: 8 },
  capturedTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  capturedRow: { gap: 10, paddingVertical: 4 },
  capturedThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  capturedTypeIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  capturedTime: { fontFamily: "Inter_400Regular", fontSize: 9, color: C.textMuted },
  permTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text, textAlign: "center" },
  permDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, textAlign: "center", maxWidth: 280, lineHeight: 20 },
  permBtn: {
    backgroundColor: C.tint,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  permBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.background },
});
