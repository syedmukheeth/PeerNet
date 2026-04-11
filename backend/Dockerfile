# Use Node.js LTS (Long Term Support) image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Final stage: running the app
FROM node:20-alpine

WORKDIR /app

# Copy node_modules and code from builder
COPY --from=builder /app ./

# Set environment
ENV NODE_ENV=production

# Health check (optional but recommended for production)
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })" || exit 1

# Start the application
CMD ["npm", "start"]
