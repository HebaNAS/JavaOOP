# Eclipse Temurin JDK 21 (for javac/java), Debian-slim base.
# We install Node.js on top so the Express server and the JDK live together.
#
# IMPORTANT: build this from the REPO ROOT so npm workspaces resolve:
#   docker build -f backend/Dockerfile -t javaoopquest-api .
# See backend/DEPLOY.md for Render / Cloud Run / Oracle Cloud steps.
FROM eclipse-temurin:21-jdk-jammy

# ── Install Node.js 20 ──────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates python3 build-essential \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# ── Install workspace deps (cache-friendly) ────────────────
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
# Frontend manifest is required because npm workspaces validates the tree;
# but we never build the frontend in this image.
COPY frontend/package.json frontend/package.json
RUN npm ci -w backend --include-workspace-root=false

# ── Copy source & build ─────────────────────────────────────
COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/src backend/src
RUN npm run build -w backend

# ── Runtime ─────────────────────────────────────────────────
WORKDIR /repo/backend
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Verify Java is on PATH at build time (fail fast if not).
RUN javac -version && java -version

CMD ["node", "dist/server.js"]
