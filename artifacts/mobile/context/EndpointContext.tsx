import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SensorData } from "./SensorContext";

export type EndpointType = "websocket" | "mqtt" | "rest" | "tcp" | "udp";

export type Endpoint = {
  id: string;
  name: string;
  type: EndpointType;
  enabled: boolean;
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  topic?: string;
  qos?: 0 | 1 | 2;
  username?: string;
  password?: string;
  tlsEnabled?: boolean;
  payloadTemplate?: string;
  lastStatus?: "connected" | "disconnected" | "error" | "sending" | "idle";
  lastError?: string;
  messageCount?: number;
};

type EndpointContextType = {
  endpoints: Endpoint[];
  addEndpoint: (ep: Omit<Endpoint, "id">) => void;
  updateEndpoint: (id: string, updates: Partial<Endpoint>) => void;
  removeEndpoint: (id: string) => void;
  sendToEndpoints: (data: SensorData) => Promise<void>;
  getStatus: (id: string) => Endpoint["lastStatus"];
  totalSent: number;
};

const EndpointContext = createContext<EndpointContextType | null>(null);

const STORAGE_KEY = "iot_endpoints";

function buildPayload(ep: Endpoint, data: SensorData): string {
  if (ep.payloadTemplate) {
    try {
      return ep.payloadTemplate
        .replace("{{data}}", JSON.stringify(data))
        .replace("{{timestamp}}", String(data.timestamp));
    } catch {}
  }
  return JSON.stringify(data);
}

export function EndpointProvider({ children }: { children: React.ReactNode }) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const wsConnections = useRef<Record<string, WebSocket>>({});

  // Always-current ref so sendToEndpoints never needs endpoints in its dep array
  const endpointsRef = useRef<Endpoint[]>([]);
  useEffect(() => {
    endpointsRef.current = endpoints;
  }, [endpoints]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setEndpoints(JSON.parse(val));
    });
    return () => {
      Object.values(wsConnections.current).forEach((ws) => {
        try { ws.close(); } catch {}
      });
    };
  }, []);

  const saveEndpoints = useCallback(async (eps: Endpoint[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(eps));
  }, []);

  // Structural changes (add/remove/config edit) — persisted to storage
  const updateEndpoint = useCallback(
    (id: string, updates: Partial<Endpoint>) => {
      setEndpoints((prev) => {
        const next = prev.map((ep) => (ep.id === id ? { ...ep, ...updates } : ep));
        saveEndpoints(next);
        return next;
      });
    },
    [saveEndpoints]
  );

  // Transient status updates during sends — NOT saved to storage, avoids re-render cascade
  const setEndpointStatus = useCallback(
    (id: string, updates: Partial<Endpoint>) => {
      setEndpoints((prev) =>
        prev.map((ep) => (ep.id === id ? { ...ep, ...updates } : ep))
      );
    },
    []
  );

  const addEndpoint = useCallback(
    (ep: Omit<Endpoint, "id">) => {
      const newEp: Endpoint = {
        ...ep,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        messageCount: 0,
        lastStatus: "idle",
      };
      setEndpoints((prev) => {
        const next = [...prev, newEp];
        saveEndpoints(next);
        return next;
      });
    },
    [saveEndpoints]
  );

  const removeEndpoint = useCallback(
    (id: string) => {
      try { wsConnections.current[id]?.close(); } catch {}
      delete wsConnections.current[id];
      setEndpoints((prev) => {
        const next = prev.filter((ep) => ep.id !== id);
        saveEndpoints(next);
        return next;
      });
    },
    [saveEndpoints]
  );

  const getOrCreateWS = useCallback(
    (ep: Endpoint): WebSocket | null => {
      const existing = wsConnections.current[ep.id];
      if (existing && existing.readyState === WebSocket.OPEN) return existing;
      try {
        const ws = new WebSocket(ep.url);
        ws.onopen = () => setEndpointStatus(ep.id, { lastStatus: "connected" });
        ws.onerror = () => setEndpointStatus(ep.id, { lastStatus: "error", lastError: "Connection failed" });
        ws.onclose = () => setEndpointStatus(ep.id, { lastStatus: "disconnected" });
        wsConnections.current[ep.id] = ws;
        return ws;
      } catch (e: any) {
        setEndpointStatus(ep.id, { lastStatus: "error", lastError: e.message });
        return null;
      }
    },
    [setEndpointStatus]
  );

  const sendToRestEndpoint = useCallback(async (ep: Endpoint, payload: string) => {
    const method = ep.method ?? "POST";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(ep.headers ?? {}),
    };
    if (ep.username && ep.password) {
      headers["Authorization"] = "Basic " + btoa(`${ep.username}:${ep.password}`);
    }
    const res = await fetch(ep.url, { method, headers, body: payload });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }, []);

  // Reads endpoints from ref — stable function reference, never causes dispatch loop
  const sendToEndpoints = useCallback(
    async (data: SensorData) => {
      const activeEps = endpointsRef.current.filter((ep) => ep.enabled);
      if (activeEps.length === 0) return;

      await Promise.allSettled(
        activeEps.map(async (ep) => {
          const payload = buildPayload(ep, data);
          try {
            if (ep.type === "websocket") {
              const ws = getOrCreateWS(ep);
              if (ws) {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(payload);
                  setEndpointStatus(ep.id, {
                    lastStatus: "connected",
                    messageCount: (ep.messageCount ?? 0) + 1,
                  });
                } else if (ws.readyState === WebSocket.CONNECTING) {
                  ws.addEventListener("open", () => { ws.send(payload); }, { once: true });
                }
              }
            } else if (ep.type === "rest") {
              setEndpointStatus(ep.id, { lastStatus: "sending" });
              await sendToRestEndpoint(ep, payload);
              setEndpointStatus(ep.id, {
                lastStatus: "connected",
                messageCount: (ep.messageCount ?? 0) + 1,
              });
            } else if (ep.type === "mqtt") {
              const mqttWsUrl = ep.url.startsWith("mqtt://")
                ? ep.url.replace("mqtt://", "ws://")
                : ep.url.startsWith("mqtts://")
                ? ep.url.replace("mqtts://", "wss://")
                : ep.url;
              const ws = getOrCreateWS({ ...ep, url: mqttWsUrl });
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
                setEndpointStatus(ep.id, {
                  lastStatus: "connected",
                  messageCount: (ep.messageCount ?? 0) + 1,
                });
              }
            } else if (ep.type === "tcp" || ep.type === "udp") {
              setEndpointStatus(ep.id, { lastStatus: "sending" });
              await sendToRestEndpoint(ep, payload);
              setEndpointStatus(ep.id, {
                lastStatus: "connected",
                messageCount: (ep.messageCount ?? 0) + 1,
              });
            }
          } catch (e: any) {
            setEndpointStatus(ep.id, { lastStatus: "error", lastError: (e as Error).message });
          }
        })
      );
      setTotalSent((prev) => prev + 1);
    },
    [getOrCreateWS, sendToRestEndpoint, setEndpointStatus]
    // No `endpoints` dependency — reads from endpointsRef instead, breaking the cascade loop
  );

  const getStatus = useCallback(
    (id: string) => endpoints.find((ep) => ep.id === id)?.lastStatus,
    [endpoints]
  );

  return (
    <EndpointContext.Provider
      value={{
        endpoints,
        addEndpoint,
        updateEndpoint,
        removeEndpoint,
        sendToEndpoints,
        getStatus,
        totalSent,
      }}
    >
      {children}
    </EndpointContext.Provider>
  );
}

export function useEndpoints() {
  const ctx = useContext(EndpointContext);
  if (!ctx) throw new Error("useEndpoints must be used within EndpointProvider");
  return ctx;
}
