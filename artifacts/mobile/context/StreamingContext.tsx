import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SensorData } from "./SensorContext";

type StreamingContextType = {
  isServerRunning: boolean;
  serverPort: number;
  connectedClients: number;
  broadcastSensorData: (data: SensorData) => void;
  onDemandRequests: OnDemandRequest[];
  clearRequests: () => void;
};

export type OnDemandRequest = {
  id: string;
  type: "sensor" | "image" | "video";
  timestamp: number;
  clientId: string;
  duration?: number;
  responded: boolean;
};

const StreamingContext = createContext<StreamingContextType | null>(null);

export function StreamingProvider({ children }: { children: React.ReactNode }) {
  const [isServerRunning] = useState(true);
  const [serverPort] = useState(8765);
  const [connectedClients, setConnectedClients] = useState(0);
  const [onDemandRequests, setOnDemandRequests] = useState<OnDemandRequest[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const clientCountRef = useRef(0);
  const latestDataRef = useRef<SensorData | null>(null);

  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        const ws = new WebSocket(`ws://localhost:${serverPort}`);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "register", role: "sensor_provider" }));
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 10000);
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === "client_count") {
              clientCountRef.current = msg.count;
              setConnectedClients(msg.count);
            } else if (msg.type === "request_sensor") {
              const req: OnDemandRequest = {
                id: Date.now().toString(),
                type: "sensor",
                timestamp: Date.now(),
                clientId: msg.clientId ?? "unknown",
                responded: false,
              };
              setOnDemandRequests((prev) => [req, ...prev].slice(0, 50));
              if (latestDataRef.current && ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "sensor_response",
                    requestId: req.id,
                    data: latestDataRef.current,
                  })
                );
                setOnDemandRequests((prev) =>
                  prev.map((r) => (r.id === req.id ? { ...r, responded: true } : r))
                );
              }
            } else if (msg.type === "request_image" || msg.type === "request_video") {
              const req: OnDemandRequest = {
                id: Date.now().toString(),
                type: msg.type === "request_image" ? "image" : "video",
                timestamp: Date.now(),
                clientId: msg.clientId ?? "unknown",
                duration: msg.duration,
                responded: false,
              };
              setOnDemandRequests((prev) => [req, ...prev].slice(0, 50));
            }
          } catch {}
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch {}
    };

    connect();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [serverPort]);

  const broadcastSensorData = useCallback((data: SensorData) => {
    latestDataRef.current = data;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "sensor_broadcast", data })
      );
    }
  }, []);

  const clearRequests = useCallback(() => {
    setOnDemandRequests([]);
  }, []);

  return (
    <StreamingContext.Provider
      value={{
        isServerRunning,
        serverPort,
        connectedClients,
        broadcastSensorData,
        onDemandRequests,
        clearRequests,
      }}
    >
      {children}
    </StreamingContext.Provider>
  );
}

export function useStreaming() {
  const ctx = useContext(StreamingContext);
  if (!ctx) throw new Error("useStreaming must be used within StreamingProvider");
  return ctx;
}
