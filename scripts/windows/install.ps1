#Requires -RunAsAdministrator
<#
.SYNOPSIS
    UndetectBrowser - Complete Windows Installation Script
.DESCRIPTION
    Installs all dependencies, configures environment, and prepares the project for Windows 10/11
.NOTES
    Run as Administrator: Right-click PowerShell -> Run as Administrator
#>

param(
    [switch]$SkipNodeCheck,
    [switch]$SkipChrome,
    [switch]$Force,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors
function Write-Color($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success($Text) { Write-Color "[OK] $Text" "Green" }
function Write-Warning($Text) { Write-Color "[!] $Text" "Yellow" }
function Write-Error($Text) { Write-Color "[X] $Text" "Red" }
function Write-Info($Text) { Write-Color "[*] $Text" "Cyan" }
function Write-Step($Text) { Write-Color "`n==> $Text" "Magenta" }

# Banner
Clear-Host
Write-Color @"
╔══════════════════════════════════════════════════════════════╗
║           UndetectBrowser Windows Installer v2.0             ║
║                  Full Auto-Configuration                      ║
╚══════════════════════════════════════════════════════════════╝
"@ "Cyan"

Write-Info "Starting installation at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Info "Windows Version: $([System.Environment]::OSVersion.VersionString)"
Write-Info "PowerShell Version: $($PSVersionTable.PSVersion)"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $ProjectRoot
Write-Info "Project Root: $ProjectRoot"

# ============================================================================
# Step 1: Check and Install Node.js
# ============================================================================
Write-Step "Checking Node.js Installation"

function Get-NodeVersion {
    try {
        $version = & node --version 2>$null
        if ($version -match "v(\d+)\.") {
            return [int]$Matches[1]
        }
    } catch {}
    return 0
}

$nodeVersion = Get-NodeVersion
$requiredNodeVersion = 18

if ($nodeVersion -lt $requiredNodeVersion -and -not $SkipNodeCheck) {
    Write-Warning "Node.js version $requiredNodeVersion+ required (found: v$nodeVersion)"
    Write-Info "Installing Node.js LTS via winget..."

    try {
        # Try winget first
        $wingetAvailable = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetAvailable) {
            winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements

            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else {
            # Fallback: Download installer
            Write-Info "Winget not available. Downloading Node.js installer..."
            $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
            $nodeInstaller = "$env:TEMP\node-installer.msi"

            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn" -Wait -NoNewWindow
            Remove-Item $nodeInstaller -Force

            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        }

        $nodeVersion = Get-NodeVersion
        if ($nodeVersion -ge $requiredNodeVersion) {
            Write-Success "Node.js v$nodeVersion installed successfully"
        } else {
            throw "Node.js installation failed"
        }
    } catch {
        Write-Error "Failed to install Node.js automatically"
        Write-Info "Please install Node.js 18+ manually from https://nodejs.org/"
        exit 1
    }
} else {
    Write-Success "Node.js v$nodeVersion is installed"
}

# Check npm
try {
    $npmVersion = & npm --version 2>$null
    Write-Success "npm v$npmVersion is installed"
} catch {
    Write-Error "npm not found. Please reinstall Node.js"
    exit 1
}

# ============================================================================
# Step 2: Install Visual Studio Build Tools (for native modules)
# ============================================================================
Write-Step "Checking Build Tools"

$hasVSBuildTools = $false
$vswhereExe = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"

if (Test-Path $vswhereExe) {
    $vsInstalls = & $vswhereExe -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -format json 2>$null | ConvertFrom-Json
    if ($vsInstalls.Count -gt 0) {
        $hasVSBuildTools = $true
    }
}

# Also check for standalone build tools
$buildToolsPath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools"
if (Test-Path $buildToolsPath) {
    $hasVSBuildTools = $true
}

if (-not $hasVSBuildTools) {
    Write-Warning "Visual Studio Build Tools not found"
    Write-Info "Installing build tools via npm..."

    try {
        # Use npm windows-build-tools for quick setup
        npm install --global windows-build-tools --vs2022 2>$null
        Write-Success "Build tools installed"
    } catch {
        Write-Warning "Could not install build tools automatically"
        Write-Info "Native modules (bcrypt, sqlite3) may fail to compile"
        Write-Info "Install manually: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    }
} else {
    Write-Success "Visual Studio Build Tools found"
}

# ============================================================================
# Step 3: Install Python (for node-gyp)
# ============================================================================
Write-Step "Checking Python"

$pythonVersion = $null
try {
    $pythonVersion = & python --version 2>$null
} catch {}

if (-not $pythonVersion) {
    try {
        $pythonVersion = & python3 --version 2>$null
    } catch {}
}

if (-not $pythonVersion) {
    Write-Warning "Python not found (required for some native modules)"
    Write-Info "Attempting to install Python via winget..."

    try {
        $wingetAvailable = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetAvailable) {
            winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            Write-Success "Python installed"
        }
    } catch {
        Write-Warning "Could not install Python automatically"
    }
} else {
    Write-Success "Python found: $pythonVersion"
}

# ============================================================================
# Step 4: Create Data Directories
# ============================================================================
Write-Step "Creating Directory Structure"

$directories = @(
    "data",
    "data\profiles",
    "data\sessions",
    "data\logs",
    "data\cache",
    "data\temp",
    "dist",
    "build",
    "release"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $ProjectRoot $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Info "Created: $dir"
    }
}
Write-Success "Directory structure ready"

# ============================================================================
# Step 5: Create Windows-optimized .env
# ============================================================================
Write-Step "Configuring Environment"

$envPath = Join-Path $ProjectRoot ".env"
$envExamplePath = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $envPath) -or $Force) {
    # Find Chrome/Chromium path
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles}\Chromium\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Chromium\Application\chrome.exe"
    )

    $foundChrome = $null
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            $foundChrome = $path
            break
        }
    }

    # Generate secure JWT secret
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

    $envContent = @"
# ============================================
# UndetectBrowser - Windows Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ============================================

# Server Configuration
PORT=3000
NODE_ENV=development
HOST=127.0.0.1

# Security (auto-generated)
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Compression
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6
COMPRESSION_THRESHOLD=1024

# Caching
CACHE_ENABLED=true
CACHE_TTL=60000

# Database (SQLite - recommended for Windows)
DB_PATH=./data/undetect.db
DB_MAX_CONNECTIONS=10

# Redis (Optional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL (Optional)
POSTGRES_ENABLED=false

# Browser Configuration - Windows Paths
PUPPETEER_EXECUTABLE_PATH=$($foundChrome -replace '\\', '/')
CHROME_PATH=$($foundChrome -replace '\\', '/')
PUPPETEER_SKIP_DOWNLOAD=false
HEADLESS=false

# Cloud Mode (false for local development)
CLOUD_MODE=false

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_PERFORMANCE_LOGGING=true

# Session Management
SESSION_TIMEOUT=3600000
MAX_CONCURRENT_SESSIONS=100

# Proxy
DEFAULT_PROXY_TIMEOUT=30000
PROXY_ROTATION_ENABLED=true

# Security Headers
ENABLE_HSTS=false
ENABLE_CSP=false
ENABLE_XSS_PROTECTION=true

# Performance
MAX_REQUEST_SIZE=10mb
ENABLE_ETAG=true
ENABLE_RESPONSE_CACHE=true

# Windows-specific
ELECTRON_ENABLE_LOGGING=true
ELECTRON_NO_SANDBOX=false
"@

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Success ".env file created with Windows configuration"

    if ($foundChrome) {
        Write-Success "Chrome found: $foundChrome"
    } else {
        Write-Warning "Chrome not found. Puppeteer will download Chromium automatically"
    }
} else {
    Write-Info ".env file already exists (use -Force to overwrite)"
}

# ============================================================================
# Step 6: Install npm dependencies
# ============================================================================
Write-Step "Installing npm Dependencies"

Write-Info "Clearing npm cache..."
npm cache clean --force 2>$null

Write-Info "Installing dependencies (this may take a few minutes)..."
try {
    # Set npm config for better Windows compatibility
    npm config set script-shell "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
    npm config set python python

    # Install with fallback for native modules
    $env:npm_config_build_from_source = "false"
    npm install --legacy-peer-deps 2>&1 | ForEach-Object {
        if ($_ -match "error|Error|ERROR") {
            Write-Warning $_
        } elseif ($Verbose) {
            Write-Info $_
        }
    }

    Write-Success "Dependencies installed"
} catch {
    Write-Warning "Some dependencies may have failed. Attempting fallback..."

    # Try installing without optional dependencies
    npm install --legacy-peer-deps --ignore-optional 2>&1
    Write-Info "Installed without optional dependencies"
}

# ============================================================================
# Step 7: Build TypeScript
# ============================================================================
Write-Step "Building TypeScript"

try {
    npm run build 2>&1 | ForEach-Object {
        if ($_ -match "error TS") {
            Write-Warning $_
        } elseif ($Verbose) {
            Write-Info $_
        }
    }
    Write-Success "TypeScript build completed"
} catch {
    Write-Warning "TypeScript build had some issues. Running with --skipLibCheck..."
    npx tsc --skipLibCheck 2>&1
}

# ============================================================================
# Step 8: Verify Installation
# ============================================================================
Write-Step "Verifying Installation"

$checks = @{
    "node_modules exists" = Test-Path (Join-Path $ProjectRoot "node_modules")
    "dist folder exists" = Test-Path (Join-Path $ProjectRoot "dist")
    "puppeteer installed" = Test-Path (Join-Path $ProjectRoot "node_modules\puppeteer")
    "electron installed" = Test-Path (Join-Path $ProjectRoot "node_modules\electron")
    ".env configured" = Test-Path $envPath
}

$allPassed = $true
foreach ($check in $checks.GetEnumerator()) {
    if ($check.Value) {
        Write-Success $check.Key
    } else {
        Write-Error $check.Key
        $allPassed = $false
    }
}

# ============================================================================
# Step 9: Create Desktop Shortcuts
# ============================================================================
Write-Step "Creating Shortcuts"

$WScriptShell = New-Object -ComObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath('Desktop')

# Main shortcut
$shortcut = $WScriptShell.CreateShortcut("$desktopPath\UndetectBrowser.lnk")
$shortcut.TargetPath = Join-Path $ProjectRoot "scripts\windows\start.bat"
$shortcut.WorkingDirectory = $ProjectRoot
$shortcut.Description = "Launch UndetectBrowser"
$shortcut.IconLocation = "shell32.dll,13"
$shortcut.Save()
Write-Success "Desktop shortcut created"

# ============================================================================
# Final Summary
# ============================================================================
Write-Color "`n" "White"
Write-Color "╔══════════════════════════════════════════════════════════════╗" "Green"
Write-Color "║              Installation Complete!                          ║" "Green"
Write-Color "╚══════════════════════════════════════════════════════════════╝" "Green"

Write-Color "`nQuick Start Commands:" "Yellow"
Write-Info "  Start GUI (Electron):     .\start.bat"
Write-Info "  Start Server:             .\start-server.bat"
Write-Info "  Development Mode:         .\start-dev.bat"
Write-Info "  Build Installer:          .\build.bat"

Write-Color "`nUseful npm commands:" "Yellow"
Write-Info "  npm run electron          - Start Electron app"
Write-Info "  npm run server            - Start API server"
Write-Info "  npm run test              - Run tests"
Write-Info "  npm run electron:build    - Build Windows installer"

if (-not $allPassed) {
    Write-Color "`n[!] Some checks failed. Run .\scripts\windows\fix-issues.ps1 to auto-repair" "Yellow"
}

Write-Color "`n" "White"
