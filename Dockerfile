# ─── Stage 1: Frontend Builder ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Backend Builder ──────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# ─── Stage 3: Runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN addgroup -S peernet && adduser -S peernet -G peernet
WORKDIR /app

# Copy production node_modules and backend source
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --chown=peernet:peernet backend/ .

# Copy frontend static build to backend public folder
COPY --from=frontend-builder --chown=peernet:peernet /app/frontend/dist ./public

# Cleanup
RUN rm -rf .git .env* *.md

USER peernet
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "src/server.js"]
