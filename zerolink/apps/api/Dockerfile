FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache ffmpeg

# copy only the manifests needed for workspace resolution
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci --ignore-scripts

FROM deps AS build
WORKDIR /app
COPY . ./
RUN npm run --workspace=@zerolink/api build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache ffmpeg dumb-init
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json

RUN npm prune --production

ENV NODE_ENV=production
EXPOSE 3000
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
