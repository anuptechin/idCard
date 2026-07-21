# syntax=docker/dockerfile:1

# ---------- Stage 1: build the React client ----------
FROM node:20-slim AS client
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---------- Stage 2: runtime (server + built client) ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client /build/client/dist /app/client/dist

ENV CLIENT_DIST=/app/client/dist
ENV DATA_DIR=/data
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]
