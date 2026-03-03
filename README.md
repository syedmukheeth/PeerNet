# 🚀 PeerNet — Production Instagram-Like API

A production-grade social media REST API backend built with Node.js, Express, MongoDB, Redis,
Cloudinary, and Socket.io.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Database | MongoDB 7 (Mongoose) |
| Cache | Redis 7 |
| Media | Cloudinary |
| Auth | JWT (access 15m + refresh 7d rotation) |
| Real-time | Socket.io |
| Validation | Joi |
| Logging | Winston + daily rotate |
| Security | Helmet, rate-limit, mongo-sanitize |
| Job scheduler | node-cron |
| Container | Docker + Docker Compose + Nginx |
| CI/CD | GitHub Actions |

---

## 🗂 Folder Structure

```
peernet/
├── src/
│   ├── app.js                # Express factory
│   ├── server.js             # Bootstrap entry point
│   ├── config/               # db, redis, cloudinary, logger
│   ├── models/               # Mongoose schemas + indexes
│   ├── services/             # Business logic layer
│   ├── controllers/          # Request/response handling
│   ├── routes/v1/            # API route definitions
│   ├── middleware/           # auth, admin, upload, validate, rateLimiter, error
│   ├── validators/           # Joi schemas
│   ├── utils/                # ApiError, jwt, cloudinary, pagination
│   ├── sockets/              # Socket.io chat handler
│   ├── jobs/                 # Cron jobs (story cleanup)
│   └── seeders/              # DB seeder
├── nginx/default.conf
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml
└── package.json
```

---

## ⚡ Quick Start (Local)

### Prerequisites

- Node.js 20+
- MongoDB running locally or Atlas URI
- Redis running locally or Redis Cloud URI
- Cloudinary account (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/your-org/peernet.git
cd peernet
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your values:
# MONGO_URI, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

### 3. Seed the database

```bash
npm run seed
# Creates: admin@peernet.dev and alice/bob/charlie/diana/eve@peernet.dev
# Password for all: Seed@1234
```

### 4. Run

```bash
npm run dev   # nodemon hot-reload
# or
npm start     # production
```

Server starts at **http://localhost:3000**
Health check: `GET /health`

---

## 🐳 Docker Deployment

```bash
cp .env.example .env
# Edit .env — MONGO_URI and REDIS_URL are auto-set by docker-compose

docker compose up -d --build
# Starts: app (3000), mongo (27017), redis (6379), nginx (80)
```

### Seed in Docker

```bash
docker compose exec app node src/seeders/seed.js
```

---

## 🌐 API Reference

All routes are prefixed with `/api/v1`. Protected routes require:
```
Authorization: Bearer <accessToken>
```

### Auth

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/auth/register` | ❌ | `{ username, email, password, fullName }` |
| POST | `/auth/login` | ❌ | `{ email, password }` |
| POST | `/auth/refresh` | ❌ | (reads httpOnly cookie) |
| POST | `/auth/logout` | ✅ | — |

**Register Response (201)**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "username": "alice", "email": "..." },
    "accessToken": "eyJ..."
  }
}
```

**Error Response**
```json
{
  "success": false,
  "message": "Email is already taken"
}
```

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/me` | Own profile |
| PATCH | `/users/me` | Update profile (multipart, `avatar` field) |
| GET | `/users/:id` | Get any profile |
| GET | `/users/:id/posts` | User's posts |
| GET | `/users/:id/followers` | Followers list |
| GET | `/users/:id/following` | Following list |
| POST | `/users/:id/follow` | Follow |
| DELETE | `/users/:id/follow` | Unfollow |
| GET | `/users/search?q=alice` | Search users |

### Posts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/posts/feed` | News feed (cursor-paginated) |
| GET | `/posts/saved` | Saved posts |
| POST | `/posts` | Create post (multipart `media` + body) |
| GET | `/posts/:id` | Get post |
| DELETE | `/posts/:id` | Delete post |
| POST | `/posts/:id/like` | Like |
| DELETE | `/posts/:id/like` | Unlike |
| POST | `/posts/:id/save` | Save |
| DELETE | `/posts/:id/save` | Unsave |
| GET | `/posts/:id/comments` | Get comments |
| POST | `/posts/:id/comments` | Add comment |

**Create Post (multipart/form-data)**
```
media: <file>
caption: "My first post!"
location: "Mumbai"
tags: "travel,photography"
```

**Feed Response (200)**
```json
{
  "success": true,
  "data": [{ "_id": "...", "caption": "...", "author": { ... } }],
  "nextCursor": "2025-01-31T10:00:00.000Z",
  "hasMore": true
}
```

### Comments

| Method | Endpoint | Description |
|---|---|---|
| DELETE | `/comments/:id` | Delete comment |
| POST | `/comments/:id/like` | Like comment |
| DELETE | `/comments/:id/like` | Unlike comment |

### Stories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/stories` | Stories from followees (non-expired) |
| POST | `/stories` | Create story (multipart `media`) |
| DELETE | `/stories/:id` | Delete story |
| POST | `/stories/:id/view` | Mark as viewed |

### Reels

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reels` | Reels feed |
| POST | `/reels` | Upload reel (multipart `video`) |
| DELETE | `/reels/:id` | Delete reel |
| POST | `/reels/:id/like` | Like reel |
| DELETE | `/reels/:id/like` | Unlike reel |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Get notifications + unreadCount |
| PATCH | `/notifications/read` | Mark all as read |

### Direct Messaging

| Method | Endpoint | Description |
|---|---|---|
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Start/get conversation `{ targetUserId }` |
| GET | `/conversations/:id/messages` | Paginated messages |
| POST | `/conversations/:id/messages` | Send message (text + optional `media`) |

### Admin (admin role required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/:id` | Delete user |
| DELETE | `/admin/posts/:id` | Delete post |
| GET | `/admin/stats` | Platform stats |

---

## 🔐 Security Details

| Concern | Implementation |
|---|---|
| Password | bcryptjs, cost factor 12 |
| Access token | JWT HS256, 15-minute expiry |
| Refresh token | JWT in `httpOnly` / `SameSite=Strict` cookie, 7-day expiry |
| Token rotation | Old JTI blacklisted in Redis on every `/auth/refresh` |
| Logout | Refresh token JTI blacklisted in Redis |
| CSRF | Access token in memory (not localStorage); refresh cookie is SameSite=Strict |
| Rate limiting | Global 100/15min; auth 5/15min; upload 50/hr |
| HTTP headers | Helmet (HSTS, CSP, X-Frame-Options, etc.) |
| NoSQL injection | express-mongo-sanitize strips `$` and `.` from inputs |
| XSS | Helmet CSP; never render HTML from user input |

---

## 🔌 WebSocket (Real-time Chat)

Connect with Socket.io:

```js
const socket = io('http://localhost:3000', {
  auth: { token: '<accessToken>' }
});

// Join a conversation room
socket.emit('join_conversation', conversationId);

// Send a message (via REST, socket receives 'new_message')
socket.on('new_message', (message) => console.log(message));

// Typing
socket.emit('typing', { conversationId });
socket.on('user_typing', ({ userId }) => console.log(`${userId} is typing...`));

// Keep online status alive
setInterval(() => socket.emit('ping_online'), 30000);
```

---

## ⏰ Cron Jobs

| Job | Schedule | What it does |
|---|---|---|
| Story Cleanup | Every hour (`:00`) | Deletes expired stories from MongoDB + Cloudinary assets |

MongoDB TTL index on `Story.expiresAt` provides a secondary cleanup mechanism.

---

## 📈 Scaling Strategy

| Layer | Strategy |
|---|---|
| App | Multiple Express instances behind Nginx load balancer |
| State | Redis for session/cache (shared across instances) |
| WebSocket | Socket.io Redis adapter for multi-node pub/sub |
| Database | MongoDB Replica Set → MongoDB Atlas |
| Media | Cloudinary CDN (removes bandwidth from app servers) |
| Container | Docker → Kubernetes HPA for pod auto-scaling |
| Feed | Pull model for MVP; transition to fan-out push for scale |

---

## 🛠 CI/CD (GitHub Actions)

1. Push to any branch → lint + Docker build check
2. Push to `main` → build + push Docker image to Docker Hub → SSH deploy to server

**Required GitHub Secrets:**
```
DOCKERHUB_USERNAME, DOCKERHUB_TOKEN
DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY
```

---

## 📝 Environment Variables

See [.env.example](.env.example) for full reference.

**Minimum required for local dev:**
```env
MONGO_URI=mongodb://localhost:27017/peernet
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change_me_at_least_64_chars
JWT_REFRESH_SECRET=change_me_different_at_least_64_chars
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```
