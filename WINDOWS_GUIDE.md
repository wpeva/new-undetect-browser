# UndetectBrowser - Windows 10 Installation Guide

## Quick Start (5 minutes)

### Step 1: Install Node.js

1. Download from **https://nodejs.org/** (LTS version)
2. Run the installer
3. **IMPORTANT**: Check "Add to PATH" during installation
4. **Restart your computer**

### Step 2: Install UndetectBrowser

1. Open the project folder
2. **Double-click** `INSTALL_WINDOWS.bat`
3. Wait 3-5 minutes for completion
4. Done!

### Step 3: Launch

**Double-click** `START_APP.bat` and choose:
- **[1]** Desktop Application (GUI)
- **[2]** Server Mode (API at http://localhost:3000)
- **[3]** Development Mode
- **[4]** Quick Browser Test

---

## Files Overview

| File | Purpose |
|------|---------|
| `INSTALL_WINDOWS.bat` | One-click installer |
| `START_APP.bat` | Launch application |
| `START_SERVER.bat` | Start API server only |
| `FIX_ERRORS.bat` | Auto-fix tool |

---

## Troubleshooting

### "node" is not recognized

- Reinstall Node.js with "Add to PATH" checked
- Restart your computer

### npm install errors

```cmd
npm cache clean --force
npm install --legacy-peer-deps --ignore-optional
```

### TypeScript build errors

```cmd
npm run build:safe
```

### Port 3000 is busy

```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Browser not found

Install Chrome or run:
```cmd
npx puppeteer browsers install chrome
```

---

## NPM Commands

| Command | Description |
|---------|-------------|
| `npm run start` | Quick start with auto-check |
| `npm run server:v2` | Start API server |
| `npm run electron` | Launch Desktop app |
| `npm run fix` | Auto-fix issues |
| `npm run doctor` | Diagnostics only |

---

## Auto-Recovery

If something goes wrong, run:

```cmd
FIX_ERRORS.bat
```

Or:

```cmd
npm run fix
```

This will automatically:
- Check and install dependencies
- Create required directories
- Rebuild TypeScript
- Fix configuration
- Check port availability

---

## System Requirements

- **OS**: Windows 10/11 (64-bit)
- **Node.js**: 18.0.0 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 2GB free space
- **Browser**: Chrome, Edge, or Chromium (optional - can be auto-downloaded)

---

**Happy browsing with UndetectBrowser!**
