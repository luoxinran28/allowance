#!/bin/bash

# Allowance Database Setup Script
# This script sets up the complete database with schema and test data

set -e  # Exit on any error

# Configuration
DB_NAME="${DB_NAME:-allowance}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if psql is available (either direct or via docker)
check_dependencies() {
    if command -v psql &> /dev/null; then
        USE_DOCKER=false
        log_info "Using direct psql connection"
    elif command -v docker &> /dev/null && docker-compose ps 2>/dev/null | grep -q postgres; then
        USE_DOCKER=true
        log_info "Using Docker psql connection"
    else
        log_error "Neither psql nor docker-compose with postgres service found."
        log_error "Please install PostgreSQL client tools or ensure Docker services are running."
        exit 1
    fi
}

# Check database connection
check_db_connection() {
    log_info "Checking database connection..."
    if [ "$USE_DOCKER" = true ]; then
        if ! docker-compose exec -T postgres psql -U "$DB_USER" -d postgres -c "SELECT 1;" &> /dev/null; then
            log_error "Cannot connect to PostgreSQL database via Docker at $DB_HOST:$DB_PORT as user $DB_USER"
            log_error "Please ensure Docker services are running."
            exit 1
        fi
    else
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" &> /dev/null; then
            log_error "Cannot connect to PostgreSQL database at $DB_HOST:$DB_PORT as user $DB_USER"
            log_error "Please ensure PostgreSQL is running and credentials are correct."
            exit 1
        fi
    fi
    log_success "Database connection successful"
}

# Create database if it doesn't exist
create_database() {
    log_info "Creating database '$DB_NAME' if it doesn't exist..."
    if [ "$USE_DOCKER" = true ]; then
        if docker-compose exec -T postgres psql -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1; then
            log_warning "Database '$DB_NAME' already exists. Skipping creation."
        else
            docker-compose exec -T postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
            log_success "Database '$DB_NAME' created successfully"
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1; then
            log_warning "Database '$DB_NAME' already exists. Skipping creation."
        else
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
            log_success "Database '$DB_NAME' created successfully"
        fi
    fi
}

# Run schema setup
run_schema() {
    local schema_file="$1"
    if [ ! -f "$schema_file" ]; then
        log_error "Schema file not found: $schema_file"
        exit 1
    fi

    log_info "Running database schema setup..."
    if [ "$USE_DOCKER" = true ]; then
        # Copy file to container and run it
        docker cp "$schema_file" allowance-postgres:/tmp/schema.sql
        if docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/schema.sql; then
            log_success "Database schema created successfully"
        else
            log_error "Failed to create database schema"
            exit 1
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$schema_file"; then
            log_success "Database schema created successfully"
        else
            log_error "Failed to create database schema"
            exit 1
        fi
    fi
}

# Run test data setup
run_test_data() {
    local test_data_file="$1"
    if [ ! -f "$test_data_file" ]; then
        log_error "Test data file not found: $test_data_file"
        exit 1
    fi

    log_info "Loading test data..."
    if [ "$USE_DOCKER" = true ]; then
        # Copy file to container and run it
        docker cp "$test_data_file" allowance-postgres:/tmp/test_data.sql
        if docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/test_data.sql; then
            log_success "Test data loaded successfully"
        else
            log_error "Failed to load test data"
            exit 1
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$test_data_file"; then
            log_success "Test data loaded successfully"
        else
            log_error "Failed to load test data"
            exit 1
        fi
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying database setup..."

    # Check if tables exist
    local table_count
    if [ "$USE_DOCKER" = true ]; then
        table_count=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    else
        table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    fi

    if [ "$table_count" -gt 10 ]; then
        log_success "Database setup verified: $table_count tables created"
    else
        log_warning "Database setup may be incomplete: only $table_count tables found"
    fi

    # Check user count
    local user_count
    if [ "$USE_DOCKER" = true ]; then
        user_count=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    else
        user_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    fi

    if [ "$user_count" -gt 5 ]; then
        log_success "Test users created: $user_count users"
    else
        log_warning "Few test users found: $user_count users"
    fi
}

# Show usage information
show_usage() {
    cat << EOF
Allowance Database Setup Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    --schema-only           Only run schema setup, skip test data
    --test-data-only        Only run test data, skip schema
    --db-name NAME          Database name (default: allowance)
    --db-user USER          Database user (default: postgres)
    --db-host HOST          Database host (default: localhost)
    --db-port PORT          Database port (default: 5432)

Environment Variables:
    DB_NAME                 Database name
    DB_USER                 Database user
    DB_HOST                 Database host
    DB_PORT                 Database port

Examples:
    $0                              # Full setup with defaults
    $0 --schema-only               # Schema only
    $0 --db-name mydb              # Custom database name
    DB_HOST=192.168.1.100 $0       # Custom host via environment

EOF
}

# Main execution
main() {
    local schema_only=false
    local test_data_only=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --schema-only)
                schema_only=true
                shift
                ;;
            --test-data-only)
                test_data_only=true
                shift
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    echo "========================================"
    echo "  Allowance Database Setup Script"
    echo "========================================"
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "User: $DB_USER"
    echo "========================================"

    # Get script directory
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    local schema_file="$script_dir/schema.sql"
    local test_data_file="$script_dir/test_data.sql"

    # Run setup steps
    check_dependencies
    check_db_connection
    create_database

    if [ "$test_data_only" = false ]; then
        run_schema "$schema_file"
    fi

    if [ "$schema_only" = false ]; then
        run_test_data "$test_data_file"
    fi

    verify_setup

    echo ""
    log_success "Database setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the application services: docker-compose up"
    echo "2. Access the frontend at: http://localhost:3030"
    echo "3. Access the API at: http://localhost:4040"
    echo ""
    echo "Test user credentials:"
    echo "  Admin: admin@test.com / TestPass123"
    echo "  User: user@test.com / TestPass123"
    echo "  Free: free@test.com / TestPass123"
}

# Run main function with all arguments
main "$@"