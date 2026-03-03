# PeerNet — Social Media Platform

> A production-grade, full-stack social media platform built with modern technologies.
> Inspired by Instagram — built for scale.

![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Status](https://img.shields.io/badge/status-production-success)

---

## What is PeerNet?

PeerNet is a full-stack social media platform with features like posts, stories, reels (Dscrolls), real-time messaging, notifications, and an admin panel — all production-ready with JWT auth, Redis caching, Cloudinary media storage, and Docker deployment.

---

## Tech Stack

### Backend
| Area | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Database | MongoDB 7 (Mongoose) |
| Cache | Redis 7 |
| Auth | JWT — 15min access + 7d refresh rotation |
| Media Storage | Cloudinary |
| Real-time | Socket.io |
| Validation | Joi |
| Logging | Winston + daily log rotation |
| Security | Helmet, rate-limit, mongo-sanitize |
| Scheduler | node-cron |

### Frontend
| Area | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v7 |
| HTTP Client | Axios |
| Real-time | Socket.io-client |
| Animations | Framer Motion |
| Icons | React Icons |
| Notifications | React Hot Toast |

### Infrastructure
| Area | Technology |
|---|---|
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| CI/CD | GitHub Actions |

---

## Project Structure

```
PeerNet/
├── frontend/                   # React + Vite client
│   ├── src/
│   │   ├── api/                # Axios instance & API calls
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # Auth & Theme context
│   │   ├── pages/              # App pages (Feed, Profile, etc.)
│   │   └── utils/              # Helper utilities
│   ├── index.html
│   └── vite.config.js
│
├── backend/                    # Node.js + Express server
│   ├── src/
│   │   ├── app.js              # Express app setup
│   │   ├── server.js           # Entry point
│   │   ├── config/             # DB, Redis, Cloudinary, Logger config
│   │   ├── models/             # Mongoose schemas (User, Post, Reel, Story, etc.)
│   │   ├── controllers/        # Route handlers
│   │   ├── services/           # Business logic
│   │   ├── routes/v1/          # API route definitions
│   │   ├── middleware/         # Auth, upload, validation, rate-limit, error
│   │   ├── validators/         # Joi request schemas
│   │   ├── utils/              # JWT, Cloudinary, pagination helpers
│   │   ├── sockets/            # Socket.io real-time chat
│   │   ├── jobs/               # Cron jobs (e.g. story cleanup)
│   │   └── seeders/            # Database seed scripts
│   └── package.json
│
├── nginx/default.conf          # Nginx reverse proxy config
├── Dockerfile
├── docker-compose.yml
├── .env.example                # Environment variable template
├── CHANGELOG.md
└── README.md
```

---

## Getting Started (Local Development)

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Redis (local or [Redis Cloud](https://redis.com/))
- [Cloudinary](https://cloudinary.com/) account (free tier works)

---

### 1. Clone the repository

```bash
git clone https://github.com/syedmukheeth/PeerNet.git
cd PeerNet
```

---

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
MONGO_URI=mongodb://localhost:27017/peernet
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_secret_at_least_64_chars
JWT_REFRESH_SECRET=your_other_secret_at_least_64_chars
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

### 3. Install dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

---

### 4. Seed the database (optional)

```bash
cd backend
npm run seed          # Creates basic test users (password: Seed@1234)
npm run seed:celebs   # Creates celebrity test accounts (password: Celeb@1234)
```

---

### 5. Run the app

**Backend** (from `backend/` folder):
```bash
npm run dev    # Development with hot-reload
npm start      # Production
```
> Backend runs at: `http://localhost:3000`

**Frontend** (from `frontend/` folder):
```bash
npm run dev
```
> Frontend runs at: `http://localhost:5173`

---

## Docker Deployment

Run the entire stack (backend + MongoDB + Redis + Nginx) with a single command:

```bash
cp .env.example .env
# Edit .env with your Cloudinary credentials
# (MONGO_URI and REDIS_URL are automatically set by docker-compose)

docker compose up -d --build
```

| Service | Port |
|---|---|
| App (API) | 3000 |
| Nginx | 80 |
| MongoDB | 27017 |
| Redis | 6379 |

**Seed in Docker:**
```bash
docker compose exec app node src/seeders/seed.js
```

---

## API Reference

All API routes are prefixed with `/api/v1`.

Protected routes require:
```
Authorization: Bearer <accessToken>
```

### Auth

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Create a new account |
| POST | `/auth/login` | ❌ | Login and receive tokens |
| POST | `/auth/refresh` | ❌ | Refresh access token (via cookie) |
| POST | `/auth/logout` | ✅ | Logout and invalidate tokens |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/me` | Get your own profile |
| PATCH | `/users/me` | Update profile / avatar |
| GET | `/users/:id` | Get any user's profile |
| GET | `/users/:id/posts` | Get user's posts |
| GET | `/users/:id/followers` | Get follower list |
| GET | `/users/:id/following` | Get following list |
| POST | `/users/:id/follow` | Follow a user |
| DELETE | `/users/:id/follow` | Unfollow a user |
| GET | `/users/search?q=name` | Search users |

### Posts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/posts/feed` | Paginated news feed |
| POST | `/posts` | Create a post (with media) |
| GET | `/posts/:id` | Get a single post |
| DELETE | `/posts/:id` | Delete your post |
| POST | `/posts/:id/like` | Like a post |
| DELETE | `/posts/:id/like` | Unlike a post |
| POST | `/posts/:id/save` | Save a post |
| DELETE | `/posts/:id/save` | Unsave a post |
| GET | `/posts/:id/comments` | Get comments |
| POST | `/posts/:id/comments` | Add a comment |
| GET | `/posts/saved` | Get your saved posts |

### Stories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/stories` | Get stories from people you follow |
| POST | `/stories` | Upload a story (expires in 24h) |
| DELETE | `/stories/:id` | Delete your story |
| POST | `/stories/:id/view` | Mark story as viewed |

### Dscrolls (Reels)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reels` | Dscrolls feed |
| POST | `/reels` | Upload a Dscroll (video) |
| DELETE | `/reels/:id` | Delete your Dscroll |
| POST | `/reels/:id/like` | Like a Dscroll |
| DELETE | `/reels/:id/like` | Unlike a Dscroll |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Get notifications + unread count |
| PATCH | `/notifications/read` | Mark all as read |

### Messaging

| Method | Endpoint | Description |
|---|---|---|
| GET | `/conversations` | List all conversations |
| POST | `/conversations` | Start a new conversation |
| GET | `/conversations/:id/messages` | Get paginated messages |
| POST | `/conversations/:id/messages` | Send a message |

### Admin *(admin role required)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/:id` | Delete a user |
| DELETE | `/admin/posts/:id` | Delete any post |
| GET | `/admin/stats` | Platform statistics |

---

## Real-time (WebSocket)

PeerNet uses Socket.io for real-time chat and notifications.

```js
const socket = io('http://localhost:3000', {
  auth: { token: '<accessToken>' }
});

// Join a conversation room
socket.emit('join_conversation', conversationId);

// Listen for new messages
socket.on('new_message', (message) => console.log(message));

// Typing indicators
socket.emit('typing', { conversationId });
socket.on('user_typing', ({ userId }) => console.log(`${userId} is typing...`));

// Online presence
setInterval(() => socket.emit('ping_online'), 30000);
```

---

## Security

| Area | How it's handled |
|---|---|
| Passwords | bcryptjs with cost factor 12 |
| Access Token | JWT HS256, expires in 15 minutes |
| Refresh Token | JWT in `httpOnly` + `SameSite=Strict` cookie, 7 days |
| Token Rotation | Old token JTI blacklisted in Redis on every refresh |
| Rate Limiting | Global: 100 req/15min — Auth: 5 req/15min |
| HTTP Headers | Helmet (HSTS, CSP, X-Frame-Options, etc.) |
| NoSQL Injection | express-mongo-sanitize blocks `$` and `.` in inputs |

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

| Type | When to use | Example |
|---|---|---|
| PATCH | Bug fix | `v1.0.0` → `v1.0.1` |
| MINOR | New feature | `v1.0.0` → `v1.1.0` |
| MAJOR | Breaking change | `v1.0.0` → `v2.0.0` |

See [CHANGELOG.md](./CHANGELOG.md) for release history.

---

## CI/CD

GitHub Actions runs automatically on every push:

1. **Any branch** → Lint check + Docker build validation
2. **`main` branch** → Build + push Docker image → Deploy to server via SSH

**Required GitHub Secrets:**
```
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
```

---

## License

[MIT](./LICENSE) © 2026 PeerNet
