# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + WebSocket (ws)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo SDK 54 (React Native)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server + WebSocket on-demand server (port 8765)
│   └── mobile/             # Expo React Native IoT Sensor Hub app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## IoT Sensor Hub — Mobile App (`artifacts/mobile`)

Full-featured mobile IoT sensor data collection and forwarding app.

### Features
- Collects all available phone sensors: Accelerometer, Gyroscope, Magnetometer, Barometer, GPS/Location, Battery, Network, Light Sensor, Pedometer
- Configurable update intervals (100ms to 5s)
- Multiple endpoint types: WebSocket, MQTT (over WS), REST/HTTP, TCP bridge, UDP bridge
- User-configurable endpoints with custom payload templates
- On-demand WebSocket server (port 8765) for external clients to request sensor data, images, and video
- Camera screen for on-demand image capture and video recording
- Dashboard with live data stream log
- Logs & Status tab showing request history and endpoint status
- Dark theme with electric teal accent

### On-Demand WebSocket API (port 8765)
External clients connect to `ws://device-ip:8765` and can send:
- `{"type":"request_sensor"}` — get current sensor snapshot
- `{"type":"request_image"}` — request a camera image capture
- `{"type":"request_video","duration":5}` — request a 5-second video clip
- `{"type":"ping"}` — heartbeat/keep-alive

## API Server (`artifacts/api-server`)

Express 5 API server with WebSocket support.

- `GET /api/healthz` — health check
- WebSocket on port 8765 — sensor on-demand server
- WebSocket at `/ws` — internal messaging

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
