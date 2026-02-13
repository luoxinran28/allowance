# =============================================================================
# Allowance Server - Optimized Docker Build
# =============================================================================
# Key optimizations:
#   1. BuildKit cache mounts for cargo registry + target (survives rebuilds)
#   2. Dependency pre-compilation with dummy source (layer cached)
#   3. "docker" profile: thin LTO + 16 codegen-units (~3-5x faster link)
#   4. Multi-stage: slim runtime image
# =============================================================================

# --- Stage 1: Builder ---
FROM rust:1.93-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first (changes rarely → layer cached)
COPY Cargo.toml Cargo.lock ./

# Create dummy source to pre-build dependencies
RUN mkdir src && \
    echo 'fn main() { println!("dummy"); }' > src/main.rs && \
    echo '' > src/lib.rs

# Pre-build dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --profile docker 2>/dev/null || true

# Remove dummy source, copy real source + migrations
RUN rm -rf src
COPY src ./src
COPY migrations ./migrations

# Build the real application (only workspace code recompiles, deps are cached)
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --profile docker && \
    cp /app/target/docker/allowance-server /app/allowance-server

# --- Stage 2: Runtime ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false appuser

WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

COPY --from=builder /app/allowance-server /app/allowance-server
COPY migrations ./migrations

RUN chown appuser:appuser /app/allowance-server /app/entrypoint.sh

USER root

EXPOSE 4040

ENTRYPOINT ["/app/entrypoint.sh"]
