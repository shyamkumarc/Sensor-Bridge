import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

type Client = {
  ws: WebSocket;
  id: string;
  role?: string;
};

let sensorProviderWs: WebSocket | null = null;
const externalClients = new Map<string, WebSocket>();

export function setupSensorWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const iotWss = new WebSocketServer({ port: 8765 });

  console.log("Sensor on-demand WebSocket server listening on port 8765");

  iotWss.on("connection", (ws: WebSocket) => {
    const clientId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    let isProvider = false;

    ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "register" && msg.role === "sensor_provider") {
          isProvider = true;
          sensorProviderWs = ws;
          broadcastClientCount();
          return;
        }

        if (msg.type === "sensor_broadcast" && isProvider) {
          externalClients.forEach((clientWs, id) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "sensor_data", data: msg.data }));
            }
          });
          return;
        }

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (msg.type === "request_sensor" || msg.type === "request_image" || msg.type === "request_video") {
          if (sensorProviderWs && sensorProviderWs.readyState === WebSocket.OPEN) {
            sensorProviderWs.send(JSON.stringify({ ...msg, clientId }));
          } else {
            ws.send(JSON.stringify({ type: "error", message: "Sensor provider not connected" }));
          }
          return;
        }

        if (msg.type === "sensor_response") {
          const targetClient = externalClients.get(msg.requestId);
          if (!targetClient) {
            externalClients.forEach((clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "sensor_response", data: msg.data }));
              }
            });
          } else if (targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify({ type: "sensor_response", data: msg.data }));
          }
          return;
        }
      } catch {}
    });

    if (!isProvider) {
      externalClients.set(clientId, ws);
      broadcastClientCount();
    }

    ws.on("close", () => {
      if (isProvider) {
        sensorProviderWs = null;
      } else {
        externalClients.delete(clientId);
      }
      broadcastClientCount();
    });

    ws.on("error", () => {});
  });

  function broadcastClientCount() {
    const count = externalClients.size;
    if (sensorProviderWs && sensorProviderWs.readyState === WebSocket.OPEN) {
      sensorProviderWs.send(JSON.stringify({ type: "client_count", count }));
    }
  }

  // Internal WebSocket for app API use
  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", () => {});
    ws.on("error", () => {});
  });
}
