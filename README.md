# Lumenta

**A privacy-first video intelligence platform that turns camera feeds into actionable signals and incidents.**

Built with AI-powered detection (Gemini, YOLOv8, Twelve Labs), MCP-based integrations, and real-time incident tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

---

## Overview

Lumenta is a browser-based **camera feed command screen** that transforms looping video clips into signals and incidents you can review. Upload feeds, watch the wall, and analyze detected events—no webcam required. Processing can run locally by default so your data stays on your device.

### Key Features

- **Multi-Feed Console** — Monitor multiple video feeds with real-time activity detection and latency/signal metrics
- **AI-Powered Detection** — Object, person, and vehicle detection (YOLOv8, Gemini, Twelve Labs); optional face recognition (ArcFace)
- **Incident Pipeline** — Detections become incidents with severity, status, and notes; stored in MongoDB
- **MCP Integrations** — Model Context Protocol for tools: email (Resend), SMS (Vonage), voice (VAPI), webhooks, and custom actions
- **Real-Time Preview** — Live video overlay with bounding boxes, event timeline, and session summaries
- **Export & Analytics** — Detection logs, session summaries, and analytics API for downstream use

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, React 19, Framer Motion, Radix UI, Tailwind |
| Detection & AI | Gemini API, YOLOv8 (ONNX), ArcFace (ONNX)|
| Backend | Next.js API Routes, MongoDB |
| Integrations | MCP (orchestrator + action executor), Resend, Vonage, VAPI |

---

## Project Structure

```
lumenta/
├── app/
│   ├── page.tsx              # Landing (hero, how it works)
│   ├── console/               # Feed wall & feed detail
│   └── api/                   # Detections, analytics, MCP, video-proxy, etc.
├── components/
│   ├── lumenta-hero.tsx       # Landing hero & waitlist
│   ├── console-view.tsx      # Multi-feed console
│   ├── camera-detail-view.tsx # Single feed + overlay + timeline
│   ├── incident-panel.tsx     # Incident list & details
│   └── ...                    # UI, video, MCP, workflow
├── lib/
│   ├── db/                    # MongoDB client
│   ├── providers/             # Detection, video understanding, face, STT, Gemini
│   ├── mcp/                   # MCP server, client, orchestrator, action executor
│   ├── frame-processor.ts     # Frame analysis pipeline
│   └── video-analyzer.ts      # Gemini video event extraction
├── types/
│   ├── lumenta.ts             # CameraFeed, Incident, VideoEvent, DetectionLog
│   └── mcp.ts                 # MCP resources & tools
└── .env                       # API keys, MongoDB, integrations
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- MongoDB (e.g. MongoDB Atlas)

### Development

```bash
# Install dependencies
pnpm install

# Start the app
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Try the Demo** to open the console and load sample feeds.


---

## Capabilities

| Capability | Description |
|------------|-------------|
| **Feed Wall** | Grid of camera feeds with activity/latency; click to open detail view |
| **Object Detection** | Person, vehicle, object, motion, alerts (YOLOv8 and Gemini) |
| **Video Understanding** | Gemini for semantic events and search |
| **Face Recognition** | ArcFace ONNX for identity matching |
| **Incidents** | Severity, status (open/acknowledged/resolved), notes, persistence |
| **Detection Logs** | Session-based logs with counts and event lists |
| **MCP Actions** | Send email, SMS, voice call, webhooks from workflows |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────────┐
│   Browser       │────▶│   Next.js (App + API Routes)             │
│   Video + UI    │     │   Frame analysis, detections, MCP        │
└─────────────────┘     └─────────────────────────────────────────┘
        │                                    │
        │                                    ▼
        │                        ┌─────────────────────┐
        │                        │  MongoDB            │
        │                        │  (incidents, logs)  │
        │                        └─────────────────────┘
        │                                    │
        └────────────────────────────────────┘
                        │
                ┌───────┴───────┐
                │  MCP Layer    │
                │  Resend /     │
                │  Vonage / VAPI│
                └───────────────┘
```

---

## License

MIT License  
Copyright © 2025
