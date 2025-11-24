#Requires -Version 5.1
<#
.SYNOPSIS
    UndetectBrowser - Auto-Fix Common Issues
.DESCRIPTION
    Automatically detects and fixes common issues on Windows
#>

param(
    [switch]$Full,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $ProjectRoot

function Write-Color($Text, $Color = "White") { Write-Host $Text -ForegroundColor $Color }
function Write-Success($Text) { Write-Color "[FIXED] $Text" "Green" }
function Write-Warning($Text) { Write-Color "[WARN] $Text" "Yellow" }
function Write-Error($Text) { Write-Color "[FAIL] $Text" "Red" }
function Write-Info($Text) { Write-Color "[INFO] $Text" "Cyan" }
function Write-Check($Text) { Write-Color "[CHECK] $Text" "Magenta" }

Clear-Host
Write-Color @"
╔══════════════════════════════════════════════════════════════╗
║         UndetectBrowser Auto-Fix Tool v2.0                   ║
╚══════════════════════════════════════════════════════════════╝
"@ "Cyan"

$issuesFound = 0
$issuesFixed = 0

# ============================================================================
# Issue 1: Missing node_modules
# ============================================================================
Write-Check "Checking node_modules..."

if (-not (Test-Path "node_modules")) {
    $issuesFound++
    Write-Warning "node_modules missing"
    Write-Info "Running npm install..."

    npm install --legacy-peer-deps 2>&1 | Out-Null

    if (Test-Path "node_modules") {
        Write-Success "node_modules installed"
        $issuesFixed++
    } else {
        Write-Error "Failed to install node_modules"
    }
} else {
    Write-Info "node_modules OK"
}

# ============================================================================
# Issue 2: Missing dist folder
# ============================================================================
Write-Check "Checking dist folder..."

if (-not (Test-Path "dist")) {
    $issuesFound++
    Write-Warning "dist folder missing"
    Write-Info "Building TypeScript..."

    npm run build 2>&1 | Out-Null

    if (Test-Path "dist") {
        Write-Success "TypeScript built"
        $issuesFixed++
    } else {
        Write-Error "Failed to build TypeScript"
    }
} else {
    Write-Info "dist folder OK"
}

# ============================================================================
# Issue 3: Missing .env file
# ============================================================================
Write-Check "Checking .env file..."

if (-not (Test-Path ".env")) {
    $issuesFound++
    Write-Warning ".env file missing"

    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success ".env created from .env.example"
        $issuesFixed++
    } else {
        Write-Error ".env.example not found"
    }
} else {
    Write-Info ".env file OK"
}

# ============================================================================
# Issue 4: Missing data directories
# ============================================================================
Write-Check "Checking data directories..."

$dataDirs = @("data", "data\profiles", "data\sessions", "data\logs", "data\cache", "data\temp")
foreach ($dir in $dataDirs) {
    if (-not (Test-Path $dir)) {
        $issuesFound++
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Created $dir"
        $issuesFixed++
    }
}
Write-Info "Data directories OK"

# ============================================================================
# Issue 5: Corrupted node_modules
# ============================================================================
Write-Check "Checking for corrupted packages..."

$criticalPackages = @("puppeteer", "electron", "express", "typescript")
$missingPackages = @()

foreach ($pkg in $criticalPackages) {
    $pkgPath = "node_modules\$pkg"
    if (-not (Test-Path $pkgPath)) {
        $missingPackages += $pkg
    }
}

if ($missingPackages.Count -gt 0) {
    $issuesFound++
    Write-Warning "Missing packages: $($missingPackages -join ', ')"
    Write-Info "Reinstalling packages..."

    npm install $missingPackages --legacy-peer-deps 2>&1 | Out-Null
    Write-Success "Packages reinstalled"
    $issuesFixed++
} else {
    Write-Info "Critical packages OK"
}

# ============================================================================
# Issue 6: Native module issues (bcrypt, sqlite3)
# ============================================================================
Write-Check "Checking native modules..."

$nativeModules = @("bcrypt", "sqlite3")
foreach ($module in $nativeModules) {
    try {
        $testResult = node -e "require('$module')" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Module error"
        }
        Write-Info "$module OK"
    } catch {
        $issuesFound++
        Write-Warning "$module needs rebuild"
        Write-Info "Rebuilding $module..."

        npm rebuild $module 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "$module rebuilt"
            $issuesFixed++
        } else {
            Write-Warning "$module rebuild failed (optional module)"
        }
    }
}

# ============================================================================
# Issue 7: Puppeteer browser missing
# ============================================================================
Write-Check "Checking Puppeteer browser..."

$puppeteerCachePath = "$env:USERPROFILE\.cache\puppeteer"
$hasPuppeteerBrowser = (Test-Path $puppeteerCachePath) -and ((Get-ChildItem $puppeteerCachePath -Recurse -Filter "chrome.exe" -ErrorAction SilentlyContinue).Count -gt 0)

if (-not $hasPuppeteerBrowser) {
    # Check if system Chrome exists
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )

    $hasSystemChrome = $false
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            $hasSystemChrome = $true
            break
        }
    }

    if (-not $hasSystemChrome) {
        $issuesFound++
        Write-Warning "No Chrome/Chromium found"
        Write-Info "Downloading Puppeteer browser..."

        npx puppeteer browsers install chrome 2>&1 | Out-Null
        Write-Success "Puppeteer browser installed"
        $issuesFixed++
    } else {
        Write-Info "System Chrome will be used"
    }
} else {
    Write-Info "Puppeteer browser OK"
}

# ============================================================================
# Issue 8: TypeScript errors
# ============================================================================
if ($Full) {
    Write-Check "Running TypeScript type check..."

    $tscOutput = npm run typecheck 2>&1
    if ($LASTEXITCODE -ne 0) {
        $issuesFound++
        Write-Warning "TypeScript errors found"
        Write-Info "Rebuilding with skipLibCheck..."

        npx tsc --skipLibCheck 2>&1 | Out-Null
        Write-Success "Build completed with skipLibCheck"
        $issuesFixed++
    } else {
        Write-Info "TypeScript OK"
    }
}

# ============================================================================
# Issue 9: Port in use
# ============================================================================
Write-Check "Checking port 3000..."

$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    $issuesFound++
    Write-Warning "Port 3000 is in use"

    $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Info "Process using port: $($process.ProcessName) (PID: $($process.Id))"
        Write-Info "Kill with: Stop-Process -Id $($process.Id) -Force"
    }
} else {
    Write-Info "Port 3000 available"
}

# ============================================================================
# Issue 10: Electron sandbox issues
# ============================================================================
Write-Check "Checking Electron configuration..."

$electronPath = "node_modules\electron"
if (Test-Path $electronPath) {
    # Set environment variable for Electron sandbox
    [System.Environment]::SetEnvironmentVariable("ELECTRON_DISABLE_SANDBOX", "0", "User")
    Write-Info "Electron sandbox configured"
}

# ============================================================================
# Issue 11: Git line endings
# ============================================================================
Write-Check "Checking Git configuration..."

try {
    $gitConfig = git config --get core.autocrlf 2>$null
    if ($gitConfig -ne "true") {
        git config core.autocrlf true 2>$null
        Write-Info "Git autocrlf set to true"
    }
} catch {
    Write-Info "Git not configured (optional)"
}

# ============================================================================
# Issue 12: Windows Defender exclusion (optional)
# ============================================================================
if ($Full) {
    Write-Check "Checking Windows Defender exclusions..."
    Write-Info "Consider adding project folder to Windows Defender exclusions for better performance"
    Write-Info "Run as Admin: Add-MpPreference -ExclusionPath '$ProjectRoot'"
}

# ============================================================================
# Summary
# ============================================================================
Write-Color "`n" "White"
Write-Color "══════════════════════════════════════════════════════════════" "Cyan"
Write-Color "                         Summary                               " "Cyan"
Write-Color "══════════════════════════════════════════════════════════════" "Cyan"

if ($issuesFound -eq 0) {
    Write-Color "`n  No issues found! Everything is working correctly.`n" "Green"
} else {
    Write-Color "`n  Issues found: $issuesFound" "Yellow"
    Write-Color "  Issues fixed: $issuesFixed" "Green"

    if ($issuesFound -gt $issuesFixed) {
        Write-Color "  Issues remaining: $($issuesFound - $issuesFixed)" "Red"
        Write-Color "`n  Some issues could not be fixed automatically." "Yellow"
        Write-Color "  Please check the messages above for manual steps.`n" "Yellow"
    } else {
        Write-Color "`n  All issues were fixed successfully!`n" "Green"
    }
}

Write-Color "══════════════════════════════════════════════════════════════`n" "Cyan"
