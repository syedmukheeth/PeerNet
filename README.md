<div align="center">

<img src="./docs/images/logo.png" width="120" alt="PeerNet" />

# PeerNet

**A production-grade, full-stack social platform engineered for real-time scale.**

[![Live](https://img.shields.io/badge/Live-peer--net--indol.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://peer-net-indol.vercel.app)
[![API](https://img.shields.io/badge/API-Render-0468D7?style=flat-square&logo=render)](https://peernet-5u5q.onrender.com/api-docs)
[![Stack](https://img.shields.io/badge/Stack-MERN-4DB33D?style=flat-square&logo=mongodb)](https://github.com/syedmukheeth/PeerNet)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

</div>

---

## Overview

PeerNet is a full-stack social media application built with the MERN stack, real-time WebSocket communication, and a dedicated Admin Console for platform governance. It handles user authentication, media uploads, live messaging, story lifecycle management, and content moderation — all running in production.

> **Live at** → [peer-net-indol.vercel.app](https://peer-net-indol.vercel.app)

---

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│              React 18 + Vite  (Vercel CDN)                  │
│         Framer Motion │ Axios │ Socket.io-client            │
└───────────────┬───────────────────────┬─────────────────────┘
                │ REST/HTTPS            │ WebSocket (WSS)
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────────────┐
│    Express API         │   │     Socket.io Realtime        │
│    (REST Gateway)      │   │     Service (Render)          │
│                        │   │                               │
│  ├── /auth             │   │  ├── presence tracking        │
│  ├── /users            │   │  ├── typing indicators        │
│  ├── /posts            │   │  ├── live notifications       │
│  ├── /messages         │   │  └── infrastructure pulse     │
│  ├── /stories (Cron)   │   │                               │
│  ├── /admin            │   └───────────┬───────────────────┘
│  └── /reports          │               │
└───────────┬────────────┘               │
            │                           │
            ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│     MongoDB Atlas        │   │      Redis Cloud             │
│     (Primary DB)         │   │                             │
│                          │   │  ├── Session cache           │
│  ├── users               │   │  ├── Rate-limit counters     │
│  ├── posts               │   │  └── Pub/Sub message bus     │
│  ├── messages            │   │       (horizontal WS scale) │
│  ├── stories             │   └─────────────────────────────┘
│  ├── reports             │
│  └── auditlogs           │   ┌─────────────────────────────┐
│                          │   │     Cloudinary CDN           │
└──────────────────────────┘   │  Image & Video Storage       │
                               │  + On-the-fly transformation │
                               └─────────────────────────────┘
```

### Request Lifecycle

```
User Action
    │
    ▼
React Component
    │ Axios (with JWT interceptor)
    ▼
Express Router
    │
    ├── authMiddleware (JWT verify)
    ├── roleMiddleware (admin guard)
    ├── rateLimiter   (Redis sliding-window)
    ├── Joi validation
    │
    ▼
Controller → Service → Mongoose Model → MongoDB
    │
    ▼
JSON Response → React Query cache invalidation → UI re-render
```

### Real-time Flow

```
Client A sends message
    │
    ▼
Socket.io Server receives event
    │
    ├── Saves to MongoDB via Message Service
    └── Publishes to Redis Pub/Sub channel
              │
              ▼
        All Socket.io instances subscribe
              │
              ▼
        Client B receives live event → UI update
```

---

## Features

| Module | What it does |
| :--- | :--- |
| **Authentication** | JWT login/register, HTTP-only cookie sessions, bcrypt password hashing |
| **Feed & Posts** | Create, like, comment, share. Supports images, videos, and text posts |
| **Stories** | 24-hour ephemeral content with server-side Cron-based expiry |
| **Shorts (Dscrolls)** | TikTok-style vertical video scroll with gesture-driven navigation |
| **Real-time Chat** | Instant messaging, typing indicators, read receipts, and online presence |
| **Notifications** | Live notification engine — follows, likes, mentions, and comments |
| **Follow System** | Follow/unfollow with mutual detection and suggestion engine |
| **Search** | Full-text user and content search |
| **Admin Console** | Full-featured governance dashboard (see below) |
| **Media CDN** | Images and videos via Cloudinary with on-the-fly resizing |

### Admin Console

The Admin Console is a dedicated governance interface accessible only to platform operators.

| Tab | Capability |
| :--- | :--- |
| Dashboard | Platform-wide KPIs — users, posts, comments, live sessions |
| Users | View, verify, and permanently remove user accounts |
| Posts | Browse and purge all platform content |
| Comments | Review and remove community comments |
| Reports | One-click resolution of user-submitted violation reports |
| Audit Log | Immutable record of every admin action (who, what, when) |
| System Health | Live infrastructure load %, latency, and active user count via WebSocket |
| Settings | Danger zone — double-authenticated full platform reset |

---

## Tech Stack

### Backend

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Runtime | Node.js 20+ | Core execution environment |
| Framework | Express.js | REST API and middleware chain |
| Database | MongoDB Atlas + Mongoose | Primary data persistence |
| Cache | Redis Cloud | Session cache, rate-limiting |
| Realtime | Socket.io + Redis Adapter | Horizontal WebSocket scaling |
| Media | Cloudinary | Image/video CDN with transforms |
| Validation | Joi | Schema-based input validation |
| Auth | JWT + bcryptjs | Token-based authentication |
| Security | Helmet, CORS, express-rate-limit | HTTP hardening and DDoS mitigation |
| Scheduling | node-cron | Story expiry lifecycle management |

### Frontend

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Framework | React 18 + Vite | Component model and build tooling |
| Animations | Framer Motion | Page transitions and micro-animations |
| Styling | Tailwind CSS | Utility-first design system |
| State | React Query + Context | Server state and auth state management |
| Realtime | Socket.io-client | Live event subscription |
| Routing | React Router v6 | Client-side navigation |
| HTTP | Axios | REST client with interceptors |

### Infrastructure

| Service | Platform |
| :--- | :--- |
| Frontend hosting | Vercel (Edge CDN) |
| Backend API | Render (auto-deploy from main) |
| Database | MongoDB Atlas (M0 Free → scalable) |
| Cache / Pub-Sub | Redis Cloud |
| Media | Cloudinary |

---

## Project Structure

```
PeerNet/
├── backend/
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth, roles, rate-limit, upload
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express route definitions
│   ├── services/           # Business logic layer
│   ├── utils/              # Helpers (token, mailer, cron)
│   └── server.js
│
├── chat-service/           # Standalone Socket.io microservice
│   ├── index.js            # Redis adapter + event handlers
│   └── ...
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance + interceptors
    │   ├── components/     # Shared UI components
    │   ├── context/        # Auth, socket context providers
    │   ├── hooks/          # Custom React hooks
    │   ├── pages/          # Route-level page components
    │   └── index.css       # Global design tokens
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- Redis Cloud account
- Cloudinary account

### Installation

```bash
git clone https://github.com/syedmukheeth/PeerNet.git
cd PeerNet
```

```bash
# Install backend
cd backend && npm install

# Install chat service
cd ../chat-service && npm install

# Install frontend
cd ../frontend && npm install
```

### Environment Variables

Create `.env` in `backend/`:

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
REDIS_URL=redis://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:5173
PORT=5000
```

Create `.env` in `chat-service/`:

```env
REDIS_URL=redis://...
CLIENT_URL=http://localhost:5173
PORT=5001
```

Create `.env` in `frontend/`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5001
```

### Run in Development

```bash
# Terminal 1 — REST API
cd backend && npm run dev

# Terminal 2 — Realtime Service
cd chat-service && npm run dev

# Terminal 3 — Frontend
cd frontend && npm run dev
```

### Docker (Production Parity)

```bash
docker compose up -d --build
```

---

## Security Design

- **Authentication**: JWT tokens with configurable expiry, HTTP-only cookies
- **Authorization**: Middleware-enforced role-based access control (`user` / `admin`)
- **Rate Limiting**: Redis-backed sliding-window limiting on auth and write endpoints
- **Input Validation**: All request bodies validated via Joi schemas before hitting controllers
- **HTTP Hardening**: Helmet middleware sets CSP, HSTS, X-Frame-Options headers
- **CORS**: Explicit allowlist, no wildcard origins in production
- **Audit Trail**: Every admin action is logged with actor identity, action type, and timestamp

---

## API Reference

Full Swagger documentation available at:

> [peernet-5u5q.onrender.com/api-docs](https://peernet-5u5q.onrender.com/api-docs)

Key endpoint groups:

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/:username
GET    /api/posts/feed
POST   /api/posts
POST   /api/posts/:id/like
GET    /api/messages/:userId
GET    /api/notifications
GET    /api/admin/stats          ← admin only
GET    /api/admin/users          ← admin only
PATCH  /api/admin/reports/:id    ← admin only
GET    /api/admin/logs           ← admin only
```

---

<div align="center">
  <p>Built by <a href="https://github.com/syedmukheeth"><b>Syed Mukheeth</b></a></p>
  <a href="https://linkedin.com/in/syedmukheeth">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white" />
  </a>
  &nbsp;
  <a href="https://github.com/syedmukheeth">
    <img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white" />
  </a>
</div>
