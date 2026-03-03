# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

# ─── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: non-root user
RUN addgroup -S peernet && adduser -S peernet -G peernet

WORKDIR /app

# Copy only production node_modules and backend source
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=peernet:peernet backend/ .

# Remove dev artifacts
RUN rm -rf .git .env* *.md

USER peernet

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Graceful shutdown support
STOPSIGNAL SIGTERM

CMD ["node", "src/server.js"]
