# Use the official Rust image as the base image
FROM rust:latest as builder

# Set the working directory
WORKDIR /app

# Copy the Cargo.toml and Cargo.lock files
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build the dependencies
RUN cargo build --release && rm -rf src

# Copy the source code
COPY src ./src

# Copy the migrations directory
COPY migrations ./migrations

# Build the application
RUN cargo build --release

# Use a smaller base image for the final stage
FROM debian:bookworm-slim

# Install required dependencies for PostgreSQL client and runtime
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -r -s /bin/false appuser

# Set the working directory
WORKDIR /app

# Copy the entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy the binary from the builder stage
COPY --from=builder /app/target/release/allowance-server /app/allowance-server

# Change ownership to the non-root user
RUN chown appuser:appuser /app/allowance-server /app/entrypoint.sh

# Expose the port the app runs on
EXPOSE 4040

# Command to run the application
ENTRYPOINT ["/app/entrypoint.sh"]