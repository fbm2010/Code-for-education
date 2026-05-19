FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm ci --workspace=packages/shared --workspace=apps/api

FROM base AS builder
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q http://localhost:3000/health -O /dev/null
CMD ["node", "dist/server.js"]
