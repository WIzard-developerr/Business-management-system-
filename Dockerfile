# Multi-Stage Production Dockerfile for Business Management System (BMS)
# --- BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy codebase and compile package
COPY . .
RUN npm run build

# --- PRODUCTION STAGE ---
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy package descriptors for installing pruned production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled enterprise bundle and index static assets from builder stage
COPY --from=builder /app/dist ./dist
# In case seed databases are utilized in runtime space
COPY --from=builder /app/db-data.json ./db-data.json

# Use non-root node user for container process security hardening
USER node

# BMS ingress proxy routes traffic on port 3000
EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/server.cjs"]
