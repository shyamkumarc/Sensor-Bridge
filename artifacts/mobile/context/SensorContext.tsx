import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from "expo-battery";
import * as Device from "expo-device";
import * as Location from "expo-location";
import * as Network from "expo-network";
import {
  Accelerometer,
  Barometer,
  Gyroscope,
  LightSensor,
  Magnetometer,
  Pedometer,
} from "expo-sensors";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

export type SensorData = {
  timestamp: number;
  accelerometer?: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
  magnetometer?: { x: number; y: number; z: number };
  barometer?: { pressure: number; relativeAltitude?: number };
  location?: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
  };
  battery?: { level: number; charging: boolean; state: string };
  network?: { type: string; isConnected: boolean; isInternetReachable: boolean | null };
  device?: { name: string | null; modelName: string | null; osVersion: string | null };
  lightSensor?: { illuminance: number };
  pedometer?: { steps: number };
};

type SensorContextType = {
  sensorData: SensorData;
  isCollecting: boolean;
  updateInterval: number;
  setUpdateInterval: (ms: number) => void;
  startCollection: () => void;
  stopCollection: () => void;
  activeSensors: Set<string>;
  toggleSensor: (sensor: string) => void;
  permissionsGranted: Record<string, boolean>;
  requestPermissions: () => Promise<void>;
};

const SensorContext = createContext<SensorContextType | null>(null);

const STORAGE_KEYS = {
  activeSensors: "iot_active_sensors",
  updateInterval: "iot_update_interval",
};

const DEFAULT_SENSORS = new Set([
  "accelerometer",
  "gyroscope",
  "magnetometer",
  "battery",
  "network",
  "location",
]);

export function SensorProvider({ children }: { children: React.ReactNode }) {
  const [sensorData, setSensorData] = useState<SensorData>({ timestamp: Date.now() });
  const [isCollecting, setIsCollecting] = useState(false);
  const [updateInterval, setUpdateIntervalState] = useState(1000);
  const [activeSensors, setActiveSensors] = useState<Set<string>>(DEFAULT_SENSORS);
  const [permissionsGranted, setPermissionsGranted] = useState<Record<string, boolean>>({});

  const subscriptions = useRef<Array<{ remove: () => void }>>([]);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const batteryInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const networkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestData = useRef<SensorData>({ timestamp: Date.now() });

  const updateData = useCallback((update: Partial<SensorData>) => {
    latestData.current = { ...latestData.current, ...update, timestamp: Date.now() };
    setSensorData({ ...latestData.current });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedSensors, storedInterval] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.activeSensors),
          AsyncStorage.getItem(STORAGE_KEYS.updateInterval),
        ]);
        if (storedSensors) setActiveSensors(new Set(JSON.parse(storedSensors)));
        if (storedInterval) setUpdateIntervalState(Number(storedInterval));
      } catch {}
    };
    load();
  }, []);

  const setUpdateInterval = useCallback(async (ms: number) => {
    setUpdateIntervalState(ms);
    await AsyncStorage.setItem(STORAGE_KEYS.updateInterval, String(ms));
    Accelerometer.setUpdateInterval(ms);
    Gyroscope.setUpdateInterval(ms);
    Magnetometer.setUpdateInterval(ms);
    Barometer.setUpdateInterval(ms);
  }, []);

  const toggleSensor = useCallback(async (sensor: string) => {
    setActiveSensors((prev) => {
      const next = new Set(prev);
      if (next.has(sensor)) next.delete(sensor);
      else next.add(sensor);
      AsyncStorage.setItem(STORAGE_KEYS.activeSensors, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const requestPermissions = useCallback(async () => {
    const granted: Record<string, boolean> = {};
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      granted.location = locStatus === "granted";
    } catch { granted.location = false; }
    setPermissionsGranted(granted);
  }, []);

  const stopCollection = useCallback(() => {
    subscriptions.current.forEach((s) => s.remove());
    subscriptions.current = [];
    locationSub.current?.remove();
    locationSub.current = null;
    if (batteryInterval.current) clearInterval(batteryInterval.current);
    if (networkInterval.current) clearInterval(networkInterval.current);
    setIsCollecting(false);
  }, []);

  const startCollection = useCallback(async () => {
    stopCollection();

    if (activeSensors.has("accelerometer")) {
      Accelerometer.setUpdateInterval(updateInterval);
      const sub = Accelerometer.addListener((d) => updateData({ accelerometer: d }));
      subscriptions.current.push(sub);
    }

    if (activeSensors.has("gyroscope")) {
      Gyroscope.setUpdateInterval(updateInterval);
      const sub = Gyroscope.addListener((d) => updateData({ gyroscope: d }));
      subscriptions.current.push(sub);
    }

    if (activeSensors.has("magnetometer")) {
      Magnetometer.setUpdateInterval(updateInterval);
      const sub = Magnetometer.addListener((d) => updateData({ magnetometer: d }));
      subscriptions.current.push(sub);
    }

    if (activeSensors.has("barometer") && Platform.OS !== "web") {
      Barometer.setUpdateInterval(updateInterval);
      const sub = Barometer.addListener((d) =>
        updateData({ barometer: { pressure: d.pressure, relativeAltitude: (d as any).relativeAltitude } })
      );
      subscriptions.current.push(sub);
    }

    if (activeSensors.has("lightSensor") && Platform.OS === "android") {
      LightSensor.setUpdateInterval(updateInterval);
      const sub = LightSensor.addListener((d) => updateData({ lightSensor: d }));
      subscriptions.current.push(sub);
    }

    if (activeSensors.has("pedometer") && Platform.OS !== "web") {
      const isAvailable = await Pedometer.isAvailableAsync().catch(() => false);
      if (isAvailable) {
        const sub = Pedometer.watchStepCount((result) =>
          updateData({ pedometer: { steps: result.steps } })
        );
        subscriptions.current.push(sub);
      }
    }

    if (activeSensors.has("location") && permissionsGranted.location) {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: updateInterval, distanceInterval: 1 },
        (loc) =>
          updateData({
            location: {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              altitude: loc.coords.altitude,
              accuracy: loc.coords.accuracy,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
            },
          })
      ).catch(() => null);
    }

    if (activeSensors.has("battery")) {
      const fetchBattery = async () => {
        try {
          const [level, state] = await Promise.all([
            Battery.getBatteryLevelAsync(),
            Battery.getBatteryStateAsync(),
          ]);
          updateData({
            battery: {
              level: Math.round(level * 100),
              charging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
              state: Battery.BatteryState[state] ?? "UNKNOWN",
            },
          });
        } catch {}
      };
      fetchBattery();
      batteryInterval.current = setInterval(fetchBattery, 5000);
    }

    if (activeSensors.has("network")) {
      const fetchNetwork = async () => {
        try {
          const net = await Network.getNetworkStateAsync();
          updateData({
            network: {
              type: net.type ?? "UNKNOWN",
              isConnected: net.isConnected ?? false,
              isInternetReachable: net.isInternetReachable ?? null,
            },
          });
        } catch {}
      };
      fetchNetwork();
      networkInterval.current = setInterval(fetchNetwork, 5000);
    }

    updateData({
      device: {
        name: Device.deviceName,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
      },
    });

    setIsCollecting(true);
  }, [activeSensors, updateInterval, permissionsGranted, stopCollection, updateData]);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    return () => stopCollection();
  }, []);

  return (
    <SensorContext.Provider
      value={{
        sensorData,
        isCollecting,
        updateInterval,
        setUpdateInterval,
        startCollection,
        stopCollection,
        activeSensors,
        toggleSensor,
        permissionsGranted,
        requestPermissions,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensor must be used within SensorProvider");
  return ctx;
}
