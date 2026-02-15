# =============================================================================
# Allowance Server - Optimized Docker Build
# =============================================================================
# Key optimizations:
#   1. Dependency pre-compilation with dummy source (Docker layer cached)
#   2. "docker" profile: thin LTO + 16 codegen-units (~3-5x faster link)
#   3. Multi-stage: slim runtime image
#
# IMPORTANT: Do NOT use --mount=type=cache on the dep pre-build step.
# Cache mounts prevent Docker layer caching, causing re-execution every build.
# Without cache mounts, Docker skips the dep step entirely on rebuilds (CACHED).
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

# Pre-build ALL dependencies (Docker layer cached unless Cargo.toml/Cargo.lock change)
# On incremental rebuilds this step shows CACHED → 0 seconds
RUN cargo build --profile docker || true

# Copy real source (invalidates cache from here forward when source changes)
RUN rm -rf src
COPY src ./src
COPY migrations ./migrations

# Build workspace code only (deps already compiled in layer above)
# touch all .rs files so cargo detects the source change — Docker COPY
# preserves original mtimes which may be older than the pre-built dummy binary.
RUN find src -name '*.rs' -exec touch {} + && \
    rm -f target/docker/allowance-server && \
    cargo build --profile docker && \
    cp target/docker/allowance-server ./allowance-server

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
