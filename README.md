<div align="center">

  <img src="./docs/images/logo.png" width="160" alt="PeerNet Logo" />

  <h1>🚀 PeerNet</h1>
  <h3>The Ultimate Microservices-Powered Social Ecosystem</h3>

  <p align="center">
    <b>A high-performance, full-stack social media platform engineered for scale, real-time engagement, and aesthetic excellence.</b>
  </p>

  <div align="center">
    <img src="https://img.shields.io/badge/Version-2.1.0-8A2BE2?style=for-the-badge&logo=github" alt="Version" />
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js" alt="Node" />
    <img src="https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge&logo=opensourceinitiative&logoColor=black" alt="License" />
    <img src="https://img.shields.io/badge/Build-Passing-007ACC?style=for-the-badge&logo=github-actions" alt="Build Status" />
  </div>

  <br />

  [🌐 Live Demo](https://peer-net-indol.vercel.app) • [📖 API Docs](https://peernet-5u5q.onrender.com/api-docs) • [💬 Chat Status](https://peernet-5u5q.onrender.com/health) • [🛠️ Architecture](#-system-architecture)

</div>

---

## 🌟 Overview

**PeerNet** is not just another social media clone; it's a sophisticated "Instagram-inspired" ecosystem built with modern engineering principles. It features a **decoupled microservices architecture**, real-time WebSocket communication, and a premium "Neon Network" design system.

### Core Pillars:
*   **⚡ Scalability**: Split into a REST API monolith and a dedicated WebSocket microservice (Chat Service).
*   **🚀 Performance**: Multi-layer caching with Redis and optimized frontend state with TanStack Query v5.
*   **🛡️ Security**: JWT-based auth with refresh token rotation and comprehensive middleware protection.
*   **💬 Real-Time**: Bi-directional event streaming for chat, typing indicators, and instant notifications.

---

## ✨ Premium Features

<div align="center">
  <table>
    <tr>
      <td width="50%">
        <h4>🎬 Dscrolls</h4>
        <p>Short-form vertical video experience with real-time interactions and seamless transition.</p>
      </td>
      <td width="50%">
        <h4>💬 Real-Time Chat</h4>
        <p>Microservice-powered messaging with typing states, online presence, and message history.</p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h4>📸 Media Hub</h4>
        <p>High-fidelity image and video uploads powered by Cloudinary with optimized CDN delivery.</p>
      </td>
      <td width="50%">
        <h4>📖 Stories</h4>
        <p>24-hour ephemeral content with automated expiration via server-side Cron jobs.</p>
      </td>
    </tr>
     <tr>
      <td width="50%">
        <h4>🔔 Live Alerts</h4>
        <p>Instant push notifications for likes, follows, and mentions using Socket.io.</p>
      </td>
      <td width="50%">
        <h4>🛡️ Admin Suite</h4>
        <p>Comprehensive platform management, user moderation, and engagement statistics.</p>
      </td>
    </tr>
  </table>
</div>

---

## 🎨 Visual Showcase

<div align="center">
  <table border="0">
    <tr>
      <td><img src="./docs/images/feed.png" width="100%" alt="Feed" /></td>
      <td><img src="./docs/images/notifications.png" width="100%" alt="Notifications" /></td>
    </tr>
    <tr>
      <td><img src="./docs/images/profile.png" width="100%" alt="Profile" /></td>
      <td><img src="./docs/images/login_dark.png" width="100%" alt="Auth" /></td>
    </tr>
  </table>
</div>

---

## 🏗️ System Architecture

PeerNet leverages a hybrid architecture to balance robust data management with high-velocity real-time events.

```mermaid
graph TD
    subgraph Client_Layer [💻 Client Layer]
        Web[React + Vite SPA]
    end

    subgraph Service_Layer [⚙️ Service Layer]
        API[Main API Monolith<br/>Express / REST]
        Chat[Chat Microservice<br/>Socket.io / WS]
    end

    subgraph Data_Layer [⚡ Persistence & Event Layer]
        DB[(🍃 MongoDB<br/>Persistence)]
        Cache[(⚡ Redis<br/>Cache & Sessions)]
        Bus[(♻️ Redis Pub/Sub<br/>Inter-service Bus)]
    end

    Web <-->|HTTPS| API
    Web <-->|WebSockets| Chat
    
    API <--> DB
    API <--> Cache
    API -->|Publish| Bus
    Bus -->|Subscribe| Chat
    Chat <--> DB
    
    style Client_Layer fill:#f9f,stroke:#333,stroke-width:2px
    style Service_Layer fill:#bbf,stroke:#333,stroke-width:2px
    style Data_Layer fill:#dfd,stroke:#333,stroke-width:2px
```

---

## 💻 Tech Stack

### ⚡ Backend Excellence
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

### 🎨 Frontend Performance
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

---

## 🚀 Quick Start

### 1. Prerequisites
*   **Node.js** v20.x+
*   **MongoDB** (Local or Atlas)
*   **Redis** (Local or Cloud)
*   **Cloudinary** (Media handling)

### 2. Global Installation

```bash
# Clone & Enter
git clone https://github.com/syedmukheeth/PeerNet.git && cd PeerNet

# Install all dependencies
npm install

# Setup Environment
cp .env.example .env
```

### 3. Execution

**Containerized (Recommended)**
```bash
docker compose up -d --build
```

**Manual Development**
```bash
# Backend
cd backend && npm run dev

# Chat Microservice
cd chat-service && npm run dev

# Frontend
cd frontend && npm run dev
```

---

## 🛡️ Security & Scalability
*   **Hashed Passwords**: Argon2/Bcrypt with adaptive salt rounds.
*   **Refresh Token Rotation**: Enhanced security against session hijacking.
*   **Rate Limiting**: Intelligent sliding-window rate limiting on critical endpoints.
*   **Pub/Sub**: Redis-backed horizontal scaling for real-time events.

---

<div align="center">
  <p>Built with 💎 by <a href="https://github.com/syedmukheeth"><b>Syed Mukheeth</b></a></p>
  
  <a href="https://linkedin.com/in/syedmukheeth"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" /></a>
  <a href="https://github.com/syedmukheeth"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" /></a>
</div>
