# test-installation.ps1
# PowerShell test script for Retro Nmap Web Interface installation

Write-Host "⚔️ Retro Nmap Installation Test" -ForegroundColor Cyan
Write-Host "================================"

function Write-Success {
    Write-Host "✓ $($args[0])" -ForegroundColor Green
}

function Write-Warning {
    Write-Host "⚠ $($args[0])" -ForegroundColor Yellow
}

function Write-Error {
    Write-Host "✗ $($args[0])" -ForegroundColor Red
}

Write-Host "`n1. Checking prerequisites..." -ForegroundColor Cyan

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Success "Docker is installed"
        Write-Host "  $dockerVersion" -ForegroundColor Gray
    } else {
        Write-Error "Docker is not installed"
        exit 1
    }
} catch {
    Write-Error "Docker is not installed"
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Success "Docker Compose is installed"
        Write-Host "  $composeVersion" -ForegroundColor Gray
    } else {
        # Check for Docker Compose v2
        $composeV2 = docker compose version 2>$null
        if ($composeV2) {
            Write-Success "Docker Compose (v2) is installed"
            Write-Host "  $($composeV2 | Select-String 'Docker Compose')" -ForegroundColor Gray
        } else {
            Write-Error "Docker Compose is not installed"
            exit 1
        }
    }
} catch {
    Write-Error "Docker Compose check failed"
    exit 1
}

# Check if Docker daemon is running
try {
    docker info 2>$null | Out-Null
    Write-Success "Docker daemon is running"
} catch {
    Write-Error "Docker daemon is not running"
    Write-Host "Start Docker Desktop from your system tray" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n2. Checking project structure..." -ForegroundColor Cyan

# Check essential files
$essentialFiles = @("docker-compose.yml", "Dockerfile.terminal", "Dockerfile.web", "server.js", "package.json")
$missingFiles = 0

foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Success "Found $file"
    } else {
        Write-Error "Missing $file"
        $missingFiles++
    }
}

if ($missingFiles -gt 0) {
    Write-Error "Missing $missingFiles essential files"
    exit 1
}

Write-Host "`n3. Checking ports..." -ForegroundColor Cyan

# Check if ports are in use
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        try {
            # Alternative method
            $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
            return $listener -ne $null
        } catch {
            return $false
        }
    }
}

$portsToCheck = @(1337, 7681)
foreach ($port in $portsToCheck) {
    if (Test-PortInUse -Port $port) {
        Write-Warning "Port $port is in use (may be our containers)"
    } else {
        Write-Success "Port $port is available"
    }
}

Write-Host "`n4. Checking containers..." -ForegroundColor Cyan

# Determine compose command
$composeCmd = "docker-compose"
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    $composeCmd = "docker compose"
}

# Check if containers are running
try {
    $containerStatus = & $composeCmd ps 2>$null
    if ($containerStatus -match "Up") {
        Write-Success "Containers are running"
    } else {
        Write-Warning "Containers are not running"
        Write-Host "Starting containers..." -ForegroundColor Yellow
        & $composeCmd up -d 2>$null
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Error "Failed to check container status"
    exit 1
}

# Check specific containers
$containers = @("nmap-web", "nmap-terminal")
foreach ($container in $containers) {
    $containerInfo = docker ps --format "{{.Names}}" | Select-String "^${container}$"
    if ($containerInfo) {
        Write-Success "$container is running"
    } else {
        Write-Error "$container is not running"
        Write-Host "Checking logs:" -ForegroundColor Yellow
        & $composeCmd logs $container --tail=10 2>$null
        exit 1
    }
}

Write-Host "`n5. Testing web interface..." -ForegroundColor Cyan

# Test web interface HTTP response
try {
    $response = Invoke-WebRequest -Uri "http://localhost:1337" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -in @(200, 301, 302)) {
        Write-Success "Web interface is accessible (HTTP $($response.StatusCode))"
    } else {
        Write-Error "Web interface returned HTTP $($response.StatusCode)"
        exit 1
    }
} catch {
    Write-Error "Web interface is not accessible"
    Write-Host "Try: curl http://localhost:1337 or open in browser" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n6. Testing terminal access..." -ForegroundColor Cyan

# Test terminal HTTP response
try {
    $terminalResponse = Invoke-WebRequest -Uri "http://localhost:7681" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($terminalResponse.StatusCode -in @(200, 301, 302, 401)) {
        Write-Success "Terminal interface is accessible (HTTP $($terminalResponse.StatusCode))"
    } else {
        Write-Warning "Terminal interface returned HTTP $($terminalResponse.StatusCode)"
    }
} catch {
    # 401 Unauthorized is expected for ttyd
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Success "Terminal interface is accessible (HTTP 401 Unauthorized - expected)"
    } else {
        Write-Warning "Terminal interface may not be accessible"
    }
}

Write-Host "`n7. Testing nmap execution..." -ForegroundColor Cyan

# Test if nmap is available in terminal container
try {
    $nmapCheck = docker exec nmap-terminal which nmap 2>$null
    if ($nmapCheck) {
        Write-Success "nmap is installed in terminal container"
        
        # Get nmap version
        $nmapVersion = docker exec nmap-terminal nmap --version 2>$null | Select-Object -First 1
        if ($nmapVersion) {
            Write-Success "nmap version: $nmapVersion"
        }
    } else {
        Write-Error "nmap is not installed in terminal container"
        exit 1
    }
} catch {
    Write-Error "Failed to test nmap execution"
    exit 1
}

Write-Host "`n8. Final system check..." -ForegroundColor Cyan

# Check container resource usage
Write-Host "Container resource usage:" -ForegroundColor Gray
try {
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" nmap-web nmap-terminal 2>$null
} catch {
    Write-Warning "Cannot display resource stats"
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Success "Installation test completed successfully!"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open web interface: http://localhost:1337" -ForegroundColor White
Write-Host "2. Access terminal: http://localhost:7681 (admin/admin)" -ForegroundColor White
Write-Host "3. Try a test scan on scanme.nmap.org" -ForegroundColor White
Write-Host ""
Write-Host "May the Force be with your scans! ⚔️" -ForegroundColor Cyan

exit 0