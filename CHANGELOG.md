# Changelog

All notable changes to PeerNet will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

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
