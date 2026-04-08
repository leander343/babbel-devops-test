# install dependencies
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile --production


# Stage 3: final image 
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Run as non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid 1001 --ingroup appgroup appuser

# Copy production deps from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy source (typecheck stage ensures it compiled cleanly)
COPY --chown=appuser:appgroup package.json tsconfig.json ./
COPY --chown=appuser:appgroup src/ ./src/

USER appuser

# Bun listens on $PORT; default 3000
EXPOSE 3000

# Healthcheck — hits the /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/index.ts"]