FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache ffmpeg

# ── Dependencies ────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --ignore-scripts

# ── Build ───────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npm run build

# ── Production image ────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache ffmpeg dumb-init

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
