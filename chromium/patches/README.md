# Chromium Anti-Detection Patches

This directory contains patches that modify Chromium to prevent bot detection and fingerprinting.

## 📋 Patch List

### 1. canvas-noise.patch

**Purpose:** Add subtle noise to canvas fingerprinting

**Modified Files:**
- `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc`
- `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc`

**Changes:**
- Adds 0.05-0.1% noise to canvas pixel data
- Uses session-based seeding for consistency within a session
- Modifies RGB channels only (preserves alpha)
- Applied on `toDataURL()` and `getImageData()` calls

**Detection Prevention:**
- Prevents canvas fingerprinting
- Makes canvas fingerprint unstable across sessions
- Noise is imperceptible to human eye

---

### 2. webgl-fingerprint.patch

**Purpose:** Spoof WebGL parameters and add noise to pixel reads

**Modified Files:**
- `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`
- `third_party/blink/renderer/modules/webgl/webgl_debug_renderer_info.idl`

**Changes:**
- Spoofs `GL_RENDERER` to generic Intel renderer
- Spoofs `GL_VENDOR` to "Google Inc. (Intel)"
- Spoofs `GL_UNMASKED_VENDOR_WEBGL` to "Intel Inc."
- Spoofs `GL_UNMASKED_RENDERER_WEBGL` to "Intel(R) UHD Graphics"
- Adds 0.1% noise to `readPixels()` output

**Detection Prevention:**
- Hides real GPU information
- Prevents WebGL fingerprinting
- Mimics common hardware configuration

---

### 3. cdp-removal.patch

**Purpose:** Remove Chrome DevTools Protocol detection vectors

**Modified Files:**
- `content/browser/devtools/devtools_http_handler.cc`
- `third_party/blink/renderer/core/inspector/inspector_dom_agent.cc`
- `v8/src/inspector/v8-console.cc`
- `chrome/browser/devtools/devtools_window.cc`
- `content/browser/devtools/protocol/browser_handler.cc`
- `third_party/blink/renderer/core/frame/navigator.cc`
- `third_party/blink/renderer/core/frame/navigator.h`

**Changes:**
- Disables DevTools HTTP handler
- Blocks DevTools window creation
- Limits inspector DOM capabilities
- Disables console profiling in stealth mode
- Forces `navigator.webdriver` to always return `false`
- Prevents setting `navigator.webdriver` property

**Detection Prevention:**
- Hides Chrome DevTools Protocol usage
- Prevents detection via `navigator.webdriver`
- Blocks DevTools-based detection methods

---

### 4. permissions-stealth.patch

**Purpose:** Add realistic permission query behavior

**Modified Files:**
- `chrome/browser/permissions/permission_manager.cc`
- `third_party/blink/renderer/modules/permissions/navigator_permissions.cc`

**Changes:**
- Adds 5-25ms random delays to permission queries
- Returns "prompt" instead of "denied" for notifications/geolocation
- Mimics real browser permission behavior

**Detection Prevention:**
- Prevents timing-based detection
- Makes permission responses more realistic
- Avoids suspicious instant responses

---

### 5. automation-removal.patch

**Purpose:** Remove all automation detection variables and flags

**Modified Files:**
- `chrome/test/chromedriver/chrome_launcher.cc`
- `content/browser/renderer_host/render_frame_host_impl.cc`
- `third_party/blink/renderer/core/exported/web_view_impl.cc`
- `chrome/renderer/chrome_content_renderer_client.cc`
- `third_party/blink/renderer/bindings/core/v8/v8_initializer.cc`

**Changes:**
- Removes `--enable-automation` flag
- Sets `AutomationControlEnabled` to always false
- Removes automation variables: `$cdc_`, `$wdc_`, `$chrome_`, etc.
- Removes Selenium variables: `__webdriver_`, `__selenium_`, etc.
- Removes PhantomJS variables: `__phantom`, `callPhantom`, etc.
- Removes Nightmare.js variables: `__nightmare`

**Detection Prevention:**
- Prevents detection via automation control variables
- Hides ChromeDriver usage
- Removes all common automation framework signatures

---

## 🔧 Applying Patches

### Automatic Application (via build.sh)

```bash
cd chromium
./build.sh 1  # Patches applied automatically during build
```

### Manual Application

```bash
# 1. Ensure you're in Chromium source directory
cd chromium/build/chromium/src

# 2. Apply individual patch
git apply /path/to/patch.patch

# 3. Apply with error recovery
git apply --reject --whitespace=fix /path/to/patch.patch

# 4. Check if patch would apply cleanly
git apply --check /path/to/patch.patch
```

### Verify Patch Application

```bash
# Check git status for modified files
git status

# View changes
git diff

# List all changes
git diff --stat
```

## 🆕 Creating New Patches

### Step 1: Make Changes

```bash
cd chromium/build/chromium/src

# Edit files as needed
vim third_party/blink/renderer/some_file.cc
```

### Step 2: Create Patch

```bash
# Create patch for uncommitted changes
git diff > /path/to/chromium/patches/new-feature.patch

# Or for specific files
git diff path/to/file1 path/to/file2 > /path/to/chromium/patches/new-feature.patch
```

### Step 3: Test Patch

```bash
# Reset changes
git checkout .

# Test patch application
git apply --check /path/to/chromium/patches/new-feature.patch

# Apply patch
git apply /path/to/chromium/patches/new-feature.patch
```

### Step 4: Document Patch

Update this README with:
- Patch purpose
- Modified files
- Changes made
- Detection prevention details

### Step 5: Add to Build Script

Update `chromium/build.sh`:

```bash
PATCHES=(
    "canvas-noise.patch"
    "webgl-fingerprint.patch"
    "cdp-removal.patch"
    "permissions-stealth.patch"
    "automation-removal.patch"
    "new-feature.patch"  # Add your patch
)
```

## 🧪 Testing Patches

### Test Canvas Patch

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.fillText('Test', 10, 10);

const fp1 = canvas.toDataURL();
const fp2 = canvas.toDataURL();

console.log('Same session:', fp1 === fp2);  // Should be true

// Different session should produce different fingerprint
```

### Test WebGL Patch

```javascript
const gl = document.createElement('canvas').getContext('webgl');
console.log('Renderer:', gl.getParameter(gl.RENDERER));
console.log('Vendor:', gl.getParameter(gl.VENDOR));

// Should show: Intel(R) UHD Graphics / Intel Inc.
```

### Test CDP Removal

```javascript
console.log('webdriver:', navigator.webdriver);  // Should be false

// Check for automation variables
const automationVars = Object.keys(window).filter(k =>
  k.includes('cdc') || k.includes('selenium') || k.includes('webdriver')
);
console.log('Automation vars:', automationVars);  // Should be empty
```

### Test Permissions Stealth

```javascript
const start = performance.now();
navigator.permissions.query({ name: 'notifications' }).then(() => {
  const duration = performance.now() - start;
  console.log('Query duration:', duration, 'ms');  // Should be 5-25ms
});
```

## 🔍 Patch Maintenance

### Updating for New Chromium Versions

When updating to a new Chromium version:

1. **Test existing patches:**
   ```bash
   git apply --check patch.patch
   ```

2. **If patch fails:**
   - Manually update the code
   - Regenerate the patch
   - Test thoroughly

3. **Update patch file:**
   ```bash
   git diff > updated-patch.patch
   ```

4. **Document changes:**
   - Update patch header with new version info
   - Note any changes in behavior

### Version Compatibility

| Patch | Tested Versions | Last Updated |
|-------|----------------|--------------|
| canvas-noise.patch | 120-122 | 2025-11-12 |
| webgl-fingerprint.patch | 120-122 | 2025-11-12 |
| cdp-removal.patch | 120-122 | 2025-11-12 |
| permissions-stealth.patch | 120-122 | 2025-11-12 |
| automation-removal.patch | 120-122 | 2025-11-12 |

## ⚠️ Important Notes

1. **Compatibility:** Patches are created for specific Chromium versions and may need updates for newer versions

2. **Testing:** Always test patches thoroughly before production use

3. **Security:** Keep Chromium version updated for security patches

4. **Ethics:** Use patches only for authorized testing and legitimate purposes

5. **Detection:** Detection methods evolve - patches may need updates

## 📚 Resources

- [Chromium Source](https://chromium.googlesource.com/chromium/src)
- [Creating Patches](https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md)
- [Git Patch Documentation](https://git-scm.com/docs/git-apply)

## 🤝 Contributing

To contribute new patches:

1. Create and test your patch
2. Document it in this README
3. Add test cases
4. Update build.sh
5. Submit pull request

---

**Last Updated:** 2025-11-12
**Chromium Version Compatibility:** 120.x - 122.x
