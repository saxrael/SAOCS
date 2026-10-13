FROM caddy:builder-alpine AS caddy-builder
ENV GOMAXPROCS=1
RUN xcaddy build --with github.com/caddy-dns/duckdns

FROM node:20-alpine AS frontend-builder

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

FROM caddy:alpine

COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy
COPY --from=frontend-builder /build/dist /srv
