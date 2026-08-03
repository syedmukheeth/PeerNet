<div align="center">

<img src="https://raw.githubusercontent.com/syedmukheeth/PeerNet/master/frontend/src/assets/logo.png" alt="PeerNet Logo" width="90" height="90" style="border-radius:20px"/>

# PeerNet

### A production-grade, full-stack social media platform.
### Inspired by Instagram — engineered for scale.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-peer--net--indol.vercel.app-6366f1?style=for-the-badge&logoColor=white)](https://peer-net-indol.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/syedmukheeth/PeerNet?style=for-the-badge&color=facc15&logo=github)](https://github.com/syedmukheeth/PeerNet/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/syedmukheeth/PeerNet?style=for-the-badge&color=22d3ee&logo=github)](https://github.com/syedmukheeth/PeerNet/forks)
[![License](https://img.shields.io/badge/License-ISC-22c55e?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.1.0-a855f7?style=for-the-badge)](CHANGELOG.md)

</div>

---

## 🌟 What makes PeerNet different?

> Most social media clones stop at CRUD. PeerNet doesn't.

PeerNet is a **fully-featured, production-ready** platform built with the exact same architecture principles used by real-world social platforms. It's not a tutorial project — it's built with:

| Principle | Implementation |
|---|---|
| **Real-time everything** | Socket.IO for live messaging, notifications, online presence, and read receipts |
| **Event-driven architecture** | Apache Kafka message queue for decoupled, scalable async processing |
| **Cache-first design** | Redis for session caching, rate limiting, and feed optimization |
| **Horizontal scaling** | Docker Compose with 2 app replicas behind Nginx load balancer |
| **Observability** | Prometheus metrics scraping + Grafana dashboards |
| **Security-hardened** | Helmet, CORS whitelisting, JWT rotation, bcrypt, rate limiting, NoSQL sanitization |
| **Mobile-first UI** | Responsive across all breakpoints with `100dvh` for iOS/Android browser chrome handling |
| **Optimistic UI** | All interactions update instantly before server confirmation — zero perceived latency |

---

## ✨ Feature Showcase

<table>
<tr>
<td width="50%">

**📱 Core Social Features**
- Instagram-style feed with infinite scroll
- Create posts with image/video upload
- Like, comment, reply, save posts
- Follow / Unfollow users
- Stories with 24-hour auto-expiry
- TikTok-style Shorts video feed
- User profiles with post grid view
- Search users and content

</td>
<td width="50%">

**💬 Messaging & Notifications**
- Real-time DMs with Socket.IO
- Message read receipts ✓✓
- Online presence indicators 🟢
- Typing indicators
- Pin, Mute, Archive conversations
- Emoji picker
- Real-time push notifications
- Unread badge counters

</td>
</tr>
<tr>
<td width="50%">

**🛡️ Admin Console**
- Full user management (Verify / Unverify / Delete)
- Content moderation (purge comments, posts)
- Platform analytics dashboard
- Infrastructure pulse monitoring
- Role-based access control

</td>
<td width="50%">

**🎨 UX & Polish**
- Dark / Light mode with persistent preference
- Glassmorphism "Digital Obsidian" design system
- Framer Motion animations & micro-interactions
- Multi-account switcher
- Optimistic UI updates everywhere
- Mobile bottom nav + top header
- Safe-area insets (iOS notch support)

</td>
</tr>
</table>

---

## 🏗️ System Design & Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│   React 18 + Vite  │  Socket.IO Client  │  TanStack Query           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼────────────────────────────────────────┐
│                       NGINX (Reverse Proxy)                         │
│              Load Balancer → 2 App Replicas                         │
└──────────┬──────────────────────────────────────────┬──────────────┘
           │                                          │
┌──────────▼──────────┐                   ┌──────────▼──────────────┐
│   App Replica #1    │                   │   App Replica #2        │
│  Express.js API     │                   │  Express.js API         │
│  Socket.IO Server   │                   │  Socket.IO Server       │
└──────────┬──────────┘                   └──────────┬──────────────┘
           │                                          │
┌──────────▼──────────────────────────────────────────▼──────────────┐
│                       DATA LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  MongoDB 7  │  │  Redis 7    │  │  Apache Kafka 3.7        │   │
│  │  (Primary   │  │  (Cache,    │  │  (Event Bus, Async       │   │
│  │   DB)       │  │   Sessions) │  │   Processing)            │   │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────────┐
│                    OBSERVABILITY LAYER                               │
│   Prometheus (metrics scraping) → Grafana (dashboards)             │
│   Winston (structured logging) → File + Console                    │
└─────────────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│   Cloudinary (media CDN)  │  Vercel (frontend hosting)             │
│   Render (backend hosting)│                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
PeerNet/
├── 📁 frontend/                    # React + Vite SPA
│   └── src/
│       ├── 📁 api/                 # Axios instances (main + chat)
│       ├── 📁 assets/              # Static assets, logo
│       ├── 📁 components/          # Reusable UI components
│       │   ├── Layout.jsx          # App shell (sidebar, mobile nav, header)
│       │   ├── CreatePostModal.jsx # Post creation with media upload
│       │   ├── StoryRail.jsx       # Instagram-style story circles
│       │   ├── EditPostModal.jsx   # In-place post editing
│       │   ├── ShareModal.jsx      # Share / copy link modal
│       │   ├── AccountSwitcherModal.jsx
│       │   └── FeedbackModal.jsx
│       ├── 📁 context/             # React Context providers
│       │   ├── AuthContext.jsx     # User session state
│       │   ├── ThemeContext.jsx    # Dark / Light mode
│       │   └── MultiAccountContext.jsx
│       ├── 📁 hooks/               # Custom React hooks
│       │   ├── useChat.js          # Chat state + mutations
│       │   └── useSocket.js        # Socket.IO connection management
│       ├── 📁 pages/               # Route-level page components
│       │   ├── Feed.jsx            # Home feed (infinite scroll)
│       │   ├── Shorts.jsx          # TikTok-style video feed
│       │   ├── Messages.jsx        # Full messaging module
│       │   ├── Notifications.jsx
│       │   ├── Profile.jsx         # User profile + post grid
│       │   ├── PostDetail.jsx      # Instagram split-view post detail
│       │   ├── Search.jsx
│       │   ├── Settings.jsx
│       │   └── Admin.jsx           # Full admin console (~1700 lines)
│       ├── 📁 utils/               # Helpers (timeago, formatters)
│       ├── index.css               # Global design system (14k+ lines)
│       └── App.jsx                 # Root router + route guards
│
├── 📁 backend/                     # Node.js + Express API
│   └── src/
│       ├── 📁 modules/             # Feature modules (Domain-Driven)
│       │   ├── auth/               # Register, Login, Refresh, Logout
│       │   ├── user/               # Profile, Follow, Search
│       │   ├── post/               # CRUD, Like, Save, Media upload
│       │   ├── comment/            # Comments, Replies, Delete
│       │   ├── feed/               # Personalized feed algorithm
│       │   ├── story/              # 24h stories + auto-cleanup job
│       │   ├── shorts/             # Video shorts feed + likes
│       │   ├── chat/               # Conversations management
│       │   ├── message/            # Messages + read receipts
│       │   ├── notification/       # Real-time notification system
│       │   ├── admin/              # Admin actions + analytics
│       │   ├── ai/                 # AI integration endpoints
│       │   └── feedback/           # User bug reports
│       ├── 📁 middleware/          # Auth, Rate limiting, Upload, Sanitize
│       ├── 📁 config/              # DB, Redis, Logger, Metrics setup
│       ├── 📁 jobs/                # node-cron scheduled tasks
│       │   └── storyCleanup.job.js # Auto-purge expired stories
│       ├── 📁 workers/             # Background processing
│       ├── 📁 validators/          # Joi request validation schemas
│       ├── 📁 utils/               # Token helpers, error factories
│       ├── app.js                  # Express factory (createApp)
│       └── server.js               # HTTP + Socket.IO server bootstrap
│
├── 📁 nginx/                       # Nginx reverse proxy config
│   └── default.conf                # Upstream, proxy_pass, WebSocket upgrade
├── 📁 prometheus/                  # Metrics config
│   └── prometheus.yml              # Scrape targets
├── 📁 docs/                        # Extended documentation
├── 📁 .github/                     # GitHub Actions CI/CD workflows
├── docker-compose.yml              # Full stack orchestration
├── Dockerfile                      # Multi-stage production build
├── render.yaml                     # Render.com deployment config
├── .env.example                    # All required environment variables
├── CHANGELOG.md                    # Version history
└── SECURITY.md                     # Security policy & reporting
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| ![React](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=black&style=flat-square) | UI component library |
| ![Vite](https://img.shields.io/badge/Vite_7-646CFF?logo=vite&logoColor=white&style=flat-square) | Build tool & dev server |
| ![React Router](https://img.shields.io/badge/React_Router_7-CA4245?logo=reactrouter&logoColor=white&style=flat-square) | Client-side routing |
| ![TanStack Query](https://img.shields.io/badge/TanStack_Query_5-FF4154?logo=reactquery&logoColor=white&style=flat-square) | Server state management & caching |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion_12-0055FF?logo=framer&logoColor=white&style=flat-square) | Animations & transitions |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO_4-010101?logo=socketdotio&logoColor=white&style=flat-square) | Real-time WebSocket client |
| ![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white&style=flat-square) | HTTP client |
| ![Vanilla CSS](https://img.shields.io/badge/Vanilla_CSS-1572B6?logo=css3&logoColor=white&style=flat-square) | Custom design system (14k+ lines) |

### Backend
| Technology | Purpose |
|---|---|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white&style=flat-square) | JavaScript runtime |
| ![Express](https://img.shields.io/badge/Express_4-000000?logo=express&logoColor=white&style=flat-square) | HTTP framework |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO_4-010101?logo=socketdotio&logoColor=white&style=flat-square) | Real-time server |
| ![MongoDB](https://img.shields.io/badge/MongoDB_7-47A248?logo=mongodb&logoColor=white&style=flat-square) | Primary database |
| ![Mongoose](https://img.shields.io/badge/Mongoose_8-880000?logo=mongoose&logoColor=white&style=flat-square) | MongoDB ODM |
| ![Redis](https://img.shields.io/badge/Redis_7-DC382D?logo=redis&logoColor=white&style=flat-square) | Caching & session store |
| ![Kafka](https://img.shields.io/badge/Apache_Kafka_3.7-231F20?logo=apachekafka&logoColor=white&style=flat-square) | Event streaming & async processing |
| ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white&style=flat-square) | Access + refresh token auth |
| ![Winston](https://img.shields.io/badge/Winston-231F20?logo=node.js&logoColor=white&style=flat-square) | Structured logging |
| ![Joi](https://img.shields.io/badge/Joi-0080FF?style=flat-square) | Request validation |

### Infrastructure & DevOps
| Technology | Purpose |
|---|---|
| ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=flat-square) | Containerization |
| ![Nginx](https://img.shields.io/badge/Nginx_1.25-009639?logo=nginx&logoColor=white&style=flat-square) | Reverse proxy & load balancer |
| ![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?logo=prometheus&logoColor=white&style=flat-square) | Metrics collection |
| ![Grafana](https://img.shields.io/badge/Grafana-F46800?logo=grafana&logoColor=white&style=flat-square) | Monitoring dashboards |
| ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white&style=flat-square) | Media storage & CDN |
| ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=flat-square) | Frontend deployment |
| ![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=black&style=flat-square) | Backend deployment |
| ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white&style=flat-square) | CI/CD pipeline |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

```bash
node >= 18.0.0
npm  >= 9.0.0
git
```

For Docker deployment, you also need:
```bash
docker >= 24.0.0
docker-compose >= 2.0.0
```

---

### Method 1 — Local Development (Recommended for contributors)

#### 1. Clone the repository
```bash
git clone https://github.com/syedmukheeth/PeerNet.git
cd PeerNet
```

#### 2. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your credentials (see [Environment Variables](#-environment-variables) section below).

#### 3. Install all dependencies
```bash
npm run install:all
```

This single command installs dependencies for the root, backend, and frontend.

#### 4. Start the development servers
```bash
npm run dev
```

This runs both the backend API and the Vite frontend concurrently:
- **Frontend** → `http://localhost:5173`
- **Backend API** → `http://localhost:3000`
- **API Docs** → `http://localhost:3000/api-docs` *(if Swagger is configured)*

#### 5. Run the tests
```bash
npm test
```

This runs Jest for the backend and Vitest for the frontend.

> **Heads up — the first backend test run downloads ~538 MB.**
> Some backend suites run against a real in-memory MongoDB via
> `mongodb-memory-server`, which needs a `mongod` binary. The version is pinned
> in `backend/package.json` under `config.mongodbMemoryServer.version`, and the
> binary is fetched once, either by the postinstall hook during
> `npm run install:all` or on the first `npm test`, whichever comes first. You
> will see `Downloading MongoDB 8.2.6` while it happens.
>
> It is cached afterwards in `backend/node_modules/.cache/mongodb-binaries`, so
> later runs take about 10 seconds. Deleting `node_modules` throws the cache
> away and the download repeats. To keep it somewhere more durable, point
> `MONGOMS_DOWNLOAD_DIR` at a path outside the project. CI caches the same
> directory with `actions/cache`, keyed on the pinned `mongod` version.

---

### Method 2 — Docker (Full production stack)

This spins up the **complete infrastructure**: App (2 replicas), MongoDB, Redis, Kafka, Nginx, Prometheus, Grafana.

```bash
# Clone
git clone https://github.com/syedmukheeth/PeerNet.git
cd PeerNet

# Configure environment
cp .env.example .env
# Edit .env with your Cloudinary credentials and JWT secrets

# Build and launch
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

| Service | URL |
|---|---|
| Application | `http://localhost:80` |
| MongoDB | `localhost:27017` |
| Redis | `localhost:6379` |
| Kafka | `localhost:9092` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3100` (admin/admin) |

---

### Method 3 — Production Build (Self-hosted)

```bash
# Build frontend, copy to backend/public, install all deps
npm run build:prod

# Start the production server
cd backend
npm start
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure each variable:

```bash
# ─── Application ─────────────────────────────────
NODE_ENV=development          # development | production
PORT=3000                     # API server port
CLIENT_URL=http://localhost:5173  # Frontend URL (for CORS)

# ─── Database ────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/peernet
# For MongoDB Atlas:
# MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/peernet

# ─── Redis ───────────────────────────────────────
REDIS_URL=redis://localhost:6379
# For Redis Cloud:
# REDIS_URL=redis://:password@host:port

# ─── JWT Auth ────────────────────────────────────
JWT_ACCESS_SECRET=<64+ character random string>
JWT_REFRESH_SECRET=<64+ character random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Cloudinary (Media Upload) ───────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ─── Rate Limiting ───────────────────────────────
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
RATE_LIMIT_MAX=100            # requests per window
AUTH_RATE_LIMIT_MAX=5         # auth attempts per window

# ─── Logging ─────────────────────────────────────
LOG_LEVEL=info                # error | warn | info | debug
LOG_DIR=logs

# ─── CORS ────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ─── Cookie ──────────────────────────────────────
COOKIE_SECURE=false           # Set to true in production (HTTPS)
```

> **Tip:** Generate secure JWT secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## 🌿 Forking & Contributing

### Fork the project

```bash
# 1. Fork via GitHub UI, then:
git clone https://github.com/<YOUR_USERNAME>/PeerNet.git
cd PeerNet

# 2. Add upstream remote to stay in sync
git remote add upstream https://github.com/syedmukheeth/PeerNet.git

# 3. Keep your fork up to date
git fetch upstream
git merge upstream/master
```

### Branch & PR Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then commit (use conventional commits)
git commit -m "feat: add story reactions"
git commit -m "fix: resolve mobile nav overflow"
git commit -m "chore: update dependencies"

# Push and open a PR
git push origin feature/your-feature-name
```

### Commit Convention

| Prefix | Use for |
|---|---|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `chore:` | Maintenance, dependencies |
| `docs:` | Documentation |
| `style:` | CSS / formatting only |
| `refactor:` | Code restructuring |
| `perf:` | Performance improvements |

---

## 📡 API Overview

Base URL: `https://peer-net-indol.vercel.app/api/v1`

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` |
| **Users** | `GET /users/:id` `PATCH /users/me` `POST /users/:id/follow` `GET /users/search` |
| **Posts** | `POST /posts` `GET /posts/:id` `DELETE /posts/:id` `POST /posts/:id/like` `POST /posts/:id/save` |
| **Comments** | `POST /posts/:id/comments` `GET /posts/:id/comments` `DELETE /comments/:id` |
| **Feed** | `GET /feed` *(cursor-paginated)* |
| **Stories** | `POST /stories` `GET /stories` `DELETE /stories/:id` |
| **Shorts** | `POST /shorts` `GET /shorts` `POST /shorts/:id/like` |
| **Chat** | `GET /chat` `POST /chat` `GET /chat/:id/messages` `POST /chat/:id/messages` |
| **Notifications** | `GET /notifications` `PATCH /notifications/:id/read` `GET /notifications/unread-count` |
| **Admin** | `GET /admin/users` `PATCH /admin/users/:id/verify` `DELETE /admin/comments/:id` |

---

## ⚡ Real-Time Events (Socket.IO)

| Event (Server → Client) | Description |
|---|---|
| `new_message` | New DM received |
| `new_notification` | Like / comment / follow notification |
| `user_status_change` | User came online / went offline |
| `messages_seen` | Read receipts updated |
| `sync_counts` | Sync unread badge counts |

| Event (Client → Server) | Description |
|---|---|
| `ping_online` | Register user as online |
| `join_conversation` | Subscribe to a chat room |
| `leave_conversation` | Unsubscribe from a chat room |
| `mark_seen` | Mark messages as read |

---

## 📊 Monitoring

After running with Docker Compose:

1. **Prometheus** → `http://localhost:9090` — Query metrics like `http_requests_total`, `nodejs_heap_size_used_bytes`
2. **Grafana** → `http://localhost:3100` — Pre-built dashboards for Node.js, MongoDB, and custom API metrics
3. **Health Check** → `GET /health` — Returns `{ "status": "ok" }`
4. **Metrics endpoint** → `GET /metrics` — Prometheus scrape format

---

## 🔐 Security Features

- ✅ **Helmet.js** — Secure HTTP headers (XSS, CSP, HSTS)
- ✅ **JWT rotation** — Short-lived access tokens (15m) + long-lived refresh tokens (7d)
- ✅ **bcrypt** — Password hashing with salt rounds
- ✅ **Rate limiting** — Global (100 req/15m) + strict auth limiter (5 req/15m)
- ✅ **CORS whitelisting** — Regex-based origin validation
- ✅ **NoSQL sanitization** — `express-mongo-sanitize` prevents injection
- ✅ **httpOnly cookies** — Refresh tokens never accessible to JavaScript
- ✅ **Input validation** — Joi schemas on all mutation endpoints
- ✅ **Role-based access** — Admin routes protected by role check middleware

---

## 🗺️ Roadmap

- [ ] WebSocket migration for feed (replace polling)
- [ ] Push notifications (Web Push API)
- [ ] End-to-end encrypted messages
- [ ] Video calling (WebRTC)
- [ ] AI-powered content recommendations
- [ ] Post scheduling
- [ ] Analytics dashboard for creators
- [ ] PWA (Progressive Web App) support

---

## 📸 Screenshots

> **Live at:** [peer-net-indol.vercel.app](https://peer-net-indol.vercel.app)

| Feed | Messages | Shorts | Admin |
|---|---|---|---|
| Infinite scroll feed | Real-time DMs | TikTok-style video | Full admin console |

---

## 👨‍💻 Developer

<div align="center">

Built with ❤️ from India by

**Syed Mukheeth**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white&style=for-the-badge)](https://www.linkedin.com/in/syedmukheeth)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white&style=for-the-badge)](https://github.com/syedmukheeth)

</div>

---

## 📄 License

This project is licensed under the **ISC License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**If PeerNet helped you learn something, please ⭐ the repo!**

*© 2026 PeerNet — Made in India 🇮🇳*

</div>
