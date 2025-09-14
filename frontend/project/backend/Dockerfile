# syntax=docker/dockerfile:1

# Builder stage: install all deps (including dev) and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Prefer npm ci if lockfile exists; fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build
# Prune devDependencies for runtime
RUN npm prune --omit=dev

# Runtime stage: copy built app and prod deps
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8081
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed ./seed
COPY package.json ./
EXPOSE 8081
CMD ["node", "dist/index.js"]
