# Changelog

All notable changes to PeerNet will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

---

## [v1.7.0] - 2026-03-10

### Added
- **Horizontal WebSocket Scaling**: Added `@socket.io/redis-adapter` to sync socket events across multiple server instances.
- **Automated Testing Suite**: Implemented Jest + MongoDB Memory Server for robust backend integration testing.
- **Frontend Component Testing**: Configured Vitest + React Testing Library + jsdom for frontend testing.
- **Frontend State Management**: Integrated `@tanstack/react-query` to handle caching, infinite scrolling, and background refetching in the Feed component.
- **Interactive API Documentation**: Generated OpenAPI 3.0 specs using Swagger UI (`swagger-jsdoc` + `swagger-ui-express`) available at `/api-docs`.

---

## [v1.5.0] - 2026-03-04

### Removed
- Removed dev-only **Quick Login** credentials hint from the Login page

### Fixed
- Feed post alignment: added `margin: 0 auto` to `.feed-layout` so posts are properly centered on wider screens

### Cleanup
- Removed unused `.auth-hint` CSS class from `index.css`

---

## [v1.4.0] - 2026-03-04

### Fixed
- **Root crash cause on Render**: Winston `exceptionHandlers` / `rejectionHandlers` using `DailyRotateFile` were calling `process.exit(1)` automatically on Render's read-only filesystem — server exited before MongoDB could ever connect
- Added writable-filesystem check before enabling file log transports (falls back to console-only on Render)
- Set `exitOnError: false` on the Winston logger to prevent transport errors from killing the process

---

## [v1.3.0] - 2026-03-04

### Fixed
- MongoDB "buffering timed out" error on Render: server now awaits MongoDB connection before opening HTTP port
- Removed insecure `NODE_TLS_REJECT_UNAUTHORIZED=0` global TLS bypass
- Improved `connectDB` with production-grade timeouts (30s server selection, 60s socket) and `/PeerNet` DB name validation
- Redis connection made non-fatal so server stays up if Redis is temporarily unavailable

---

## [v1.2.0] - 2026-03-04

### Fixed
- `dotenv` path resolution broken inside Docker / Render — now uses dual-path fallback strategy
- `unhandledRejection` handler was calling `process.exit(1)`, killing the server on transient DB reconnects — changed to log-only

### Added
- `render.yaml` at repo root so Render correctly points to the `backend/` root directory with the right start command and env var declarations

---

## [v1.1.0] - 2026-03-04

### Changed
- Refined Feed UI layout and right-hand panel design for improved responsiveness
- Added share button functionality to feed posts

### Added
- New Post Detail page (`PostDetail.jsx`) with full post view, comments, and interactions

---

## [v1.0.0] - 2026-03-03

### 🎉 Initial Release

#### Backend
- REST API with Node.js / Express
- MongoDB + Mongoose models (User, Post, Reel, Story, Comment, Like, Message, Notification, etc.)
- Redis caching & session support
- JWT access + refresh token authentication
- Cloudinary image/video upload
- Socket.io real-time chat
- Rate limiting, helmet security, CORS
- Admin routes & celebrity seed data
- Winston structured logging with daily rotation
- Docker + nginx setup

#### Frontend
- React 18 + Vite SPA
- React Router v7 navigation
- Axios API integration
- Real-time messaging via Socket.io-client
- Framer Motion animations
- Pages: Feed, Profile, Search, Messages, Notifications, Post Detail, Dscrolls
- Auth: Login / Register with JWT
- Light/Dark theme support

---

<!-- Template for future releases:

## [vX.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Updates to existing features

### Fixed
- Bug fixes

### Removed
- Removed features

-->
