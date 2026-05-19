FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
