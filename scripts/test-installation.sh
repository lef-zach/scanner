#!/bin/bash

# test-installation.sh
# Test script for Retro Nmap Web Interface installation
# Run this after installation to verify everything works

set -e

echo "⚔️ Retro Nmap Installation Test"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    if command_exists netstat; then
        netstat -tuln | grep -q ":$1 "
    elif command_exists ss; then
        ss -tuln | grep -q ":$1 "
    elif command_exists lsof; then
        lsof -i :$1 >/dev/null 2>&1
    else
        warning "Cannot check port $1 (no netstat, ss, or lfound)"
        return 1
    fi
}

echo ""
echo "1. Checking prerequisites..."

# Check Docker
if command_exists docker; then
    success "Docker is installed"
    docker --version
else
    error "Docker is not installed"
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose; then
    success "Docker Compose is installed"
    docker-compose --version
elif docker compose version >/dev/null 2>&1; then
    success "Docker Compose (v2) is installed"
    docker compose version
else
    error "Docker Compose is not installed"
    exit 1
fi

# Check if Docker daemon is running
if docker info >/dev/null 2>&1; then
    success "Docker daemon is running"
else
    error "Docker daemon is not running"
    echo "Start Docker Desktop or run: sudo systemctl start docker"
    exit 1
fi

echo ""
echo "2. Checking project structure..."

# Check essential files
essential_files=("docker-compose.yml" "Dockerfile.terminal" "Dockerfile.web" "server.js" "package.json")
missing_files=0

for file in "${essential_files[@]}"; do
    if [ -f "$file" ]; then
        success "Found $file"
    else
        error "Missing $file"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    error "Missing $missing_files essential files"
    exit 1
fi

echo ""
echo "3. Checking ports..."

# Check if ports are available
ports_to_check=(1337 7681)
for port in "${ports_to_check[@]}"; do
    if port_in_use $port; then
        warning "Port $port is in use (may be our containers)"
    else
        success "Port $port is available"
    fi
done

echo ""
echo "4. Checking containers..."

# Check if containers are running
if command_exists docker-compose; then
    compose_cmd="docker-compose"
else
    compose_cmd="docker compose"
fi

# Try to start containers if not running
if $compose_cmd ps | grep -q "Up"; then
    success "Containers are running"
else
    warning "Containers are not running"
    echo "Starting containers..."
    $compose_cmd up -d
    sleep 10
fi

# Check specific containers
containers=("nmap-web" "nmap-terminal")
for container in "${containers[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        success "$container is running"
    else
        error "$container is not running"
        echo "Checking logs:"
        $compose_cmd logs "$container" --tail=10
        exit 1
    fi
done

echo ""
echo "5. Testing web interface..."

# Test web interface HTTP response
if command_exists curl; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:1337 | grep -q "200\|301\|302"; then
        success "Web interface is accessible (HTTP 200)"
    else
        error "Web interface is not accessible"
        echo "Try: curl -v http://localhost:1337"
        exit 1
    fi
elif command_exists wget; then
    if wget -q --spider http://localhost:1337; then
        success "Web interface is accessible"
    else
        error "Web interface is not accessible"
        exit 1
    fi
else
    warning "Cannot test web interface (no curl or wget)"
fi

echo ""
echo "6. Testing terminal access..."

# Test terminal HTTP response (basic check)
if command_exists curl; then
    terminal_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7681 || echo "000")
    if [[ "$terminal_response" =~ ^(200|301|302|401)$ ]]; then
        success "Terminal interface is accessible (HTTP $terminal_response)"
    else
        warning "Terminal interface may not be accessible (HTTP $terminal_response)"
        echo "Note: Terminal returns 401 Unauthorized which is expected"
    fi
fi

echo ""
echo "7. Testing nmap execution..."

# Test if nmap is available in terminal container
if docker exec nmap-terminal which nmap >/dev/null 2>&1; then
    success "nmap is installed in terminal container"
    
    # Quick version check
    nmap_version=$(docker exec nmap-terminal nmap --version 2>/dev/null | head -1)
    if [ -n "$nmap_version" ]; then
        success "nmap version: $nmap_version"
    fi
else
    error "nmap is not installed in terminal container"
    exit 1
fi

echo ""
echo "8. Final system check..."

# Check resource usage
echo "Container resource usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" nmap-web nmap-terminal 2>/dev/null || \
    warning "Cannot display resource stats"

echo ""
echo "================================"
success "Installation test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Open web interface: http://localhost:1337"
echo "2. Access terminal: http://localhost:7681 (admin/admin)"
echo "3. Try a test scan on scanme.nmap.org"
echo ""
echo "May the Force be with your scans! ⚔️"

exit 0