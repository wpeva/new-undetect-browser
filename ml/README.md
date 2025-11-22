# ML Dataset Collection & Profile Generation - Sessions 9-10

Machine Learning fingerprint dataset collection and profile generation module for training and generating realistic browser fingerprints.

## Overview

This module provides tools for collecting, parsing, validating, and managing large-scale browser fingerprint datasets, as well as training and using ML models to generate realistic fingerprint profiles.

The collected data can be used for:

- Training ML models for fingerprint generation
- Generating consistent and realistic browser profiles
- Analyzing fingerprint patterns and distributions
- Testing anti-detection capabilities
- Research on browser fingerprinting

## Features

### Session 9: Data Collection
✅ **Fingerprint Scraper** - Collect real browser fingerprints from various sources
✅ **Data Parser** - Normalize and analyze collected data
✅ **Validation** - Ensure data quality and consistency
✅ **Sample Generator** - Generate realistic sample data without scraping
✅ **1000+ Fingerprints** - Pre-generated dataset included

### Session 10: ML Profile Generation
✅ **ML Model** - Transformer-based fingerprint generator (GPT-2 + Custom Decoder)
✅ **Training Pipeline** - Complete training script with validation
✅ **Profile Generator** - Generate consistent profiles from parameters
✅ **TypeScript API** - Easy-to-use API for Node.js/TypeScript
✅ **Consistency Validation** - Automatic validation of generated profiles

### Session 11: Adaptive Detection System
✅ **Detection Monitor** - Automated testing against 5 major detection sites
✅ **RL Agent** - PPO-based reinforcement learning for optimization
✅ **Auto-Updater** - Automatic deployment of improved configurations
✅ **Dashboard** - Real-time monitoring and visualization
✅ **Self-Improving** - Continuous optimization through RL

## Architecture

```
ml/
├── data-collection/          # Session 9: Data Collection
│   ├── scraper.ts           # Browser fingerprint scraper
│   ├── parser.ts            # Data normalization and parsing
│   ├── generator.ts         # Sample data generator
│   └── demo.ts              # Demo script
├── datasets/
│   ├── validation.ts        # Dataset validation
│   └── fingerprints.json    # 1000+ sample fingerprints (~6.4MB)
├── models/                  # Session 10: ML Models
│   ├── profile-generator.py # ML model (GPT-2 + Custom Decoder)
│   ├── train.py             # Training script
│   └── generate.py          # Inference script
├── api/                     # Session 10: TypeScript API
│   └── generate.ts          # Profile generator API
├── detection/               # Session 11: Adaptive Detection System
│   ├── monitor.ts           # Detection testing across multiple sites
│   ├── rl-agent.py          # Reinforcement learning agent (PPO)
│   ├── auto-updater.ts      # Automatic configuration updates
│   ├── dashboard.ts         # Real-time monitoring dashboard
│   ├── demo.ts              # Demo scripts
│   ├── index.ts             # Module exports
│   └── README.md            # Session 11 documentation
├── types/
│   └── fingerprint.ts       # TypeScript types
├── scripts/
│   └── generate-sample-dataset.js  # Quick dataset generator
├── requirements.txt         # Python dependencies (including RL)
└── README.md               # This file
```

## Data Structure

Each fingerprint contains:

```typescript
interface Fingerprint {
  id: string;
  timestamp: number;
  source: string;

  // Fingerprint components
  canvas: CanvasFingerprint;
  webgl: WebGLFingerprint;
  audio: AudioFingerprint;
  fonts: FontFingerprint;
  screen: ScreenFingerprint;
  hardware: HardwareFingerprint;
  navigator: NavigatorFingerprint;
  mediaDevices?: MediaDevicesFingerprint;
  battery?: BatteryFingerprint;

  // Metadata
  metadata: {
    userAgent: string;
    browserName: string;
    browserVersion: string;
    osName: string;
    osVersion: string;
    deviceType: string;
    isBot: boolean;
    consistency: number;
  };
}
```

## Usage

### 1. Generate Sample Dataset

Quick way to create a dataset without browser scraping:

```bash
# Generate 1000 fingerprints (default)
node ml/scripts/generate-sample-dataset.js

# Generate custom count
node ml/scripts/generate-sample-dataset.js 10000

# Custom output path
node ml/scripts/generate-sample-dataset.js 5000 ./output/data.json
```

### 2. Scrape Real Fingerprints

Collect real fingerprints using headless browsers:

```typescript
import { FingerprintScraper } from './ml/data-collection/scraper';

const scraper = new FingerprintScraper({
  count: 10000,
  headless: true,
  delayBetweenRequests: 1000,
});

// Collect fingerprints
const fingerprints = await scraper.scrapeRealFingerprints();

// Save to file
await scraper.saveFingerprints('./datasets/fingerprints.json');
```

### 3. Parse and Normalize Data

Process collected fingerprints:

```typescript
import { FingerprintParser } from './ml/data-collection/parser';

const parser = new FingerprintParser();

// Load from file
parser.loadFromFile('./datasets/raw-fingerprints.json');

// Parse all fingerprints
const parsed = parser.parseAll();

// Deduplicate
parser.deduplicate();

// Get statistics
const stats = parser.getStats();
console.log('Total:', stats.totalFingerprints);
console.log('Valid:', stats.validFingerprints);
console.log('Average Quality:', stats.averageQuality);

// Filter by quality
const highQuality = parser.filterByQuality(0.8);

// Save results
parser.saveToFile('./datasets/parsed-fingerprints.json');
parser.saveStats('./datasets/stats.json');
```

### 4. Validate Dataset

Ensure data quality and consistency:

```typescript
import { FingerprintValidator } from './ml/datasets/validation';

const validator = new FingerprintValidator();

// Validate single fingerprint
const result = validator.validateFingerprint(fingerprint);
console.log('Valid:', result.valid);
console.log('Quality:', result.quality);
console.log('Errors:', result.errors);

// Validate entire dataset
const datasetResult = validator.validateDataset(fingerprints);
console.log('Valid:', datasetResult.valid);
console.log('Invalid:', datasetResult.invalid);

// Generate and save report
validator.saveReport(datasetResult.results, './validation-report.md');
```

### 5. Run Demo

Complete demonstration of all features:

```bash
npm run build
node dist/ml/data-collection/demo.js
```

## Data Collection Methods

### Method 1: Browser Scraping (Recommended for Production)

Collects real fingerprints from actual browsers:

**Pros:**
- Most realistic data
- Captures actual browser variations
- Better for ML training

**Cons:**
- Slower (1-2 seconds per fingerprint)
- Requires browser automation
- May hit rate limits

```typescript
const scraper = new FingerprintScraper({ count: 10000 });
const fingerprints = await scraper.scrapeRealFingerprints();
```

### Method 2: Sample Generation (Fast, for Testing)

Generates realistic sample data programmatically:

**Pros:**
- Very fast (1000+ fingerprints/second)
- No external dependencies
- Good for testing

**Cons:**
- Less realistic than real data
- Patterns may be too uniform

```bash
node ml/scripts/generate-sample-dataset.js 10000
```

## Dataset Statistics

The included dataset contains 1000 fingerprints with:

- **Browsers**: Chrome, Firefox, Safari, Edge
- **Platforms**: Windows, macOS, Linux
- **Screen Resolutions**: 1920x1080, 1366x768, 2560x1440, etc.
- **CPU Cores**: 2, 4, 6, 8, 12, 16
- **Device Memory**: 4GB, 8GB, 16GB, 32GB

## Validation Checks

The validator performs comprehensive checks:

### Required Fields
- ID, timestamp, source
- Canvas, WebGL, screen data
- Hardware, navigator info

### Consistency Checks
- User agent matching across components
- Language consistency
- Hardware concurrency matching
- Touch support consistency

### Quality Checks
- Completeness of data
- Realistic value ranges
- Browser/OS compatibility

### Realistic Values
- Screen resolutions (800x600 to 7680x4320)
- CPU cores (1-128)
- Device memory (0.25GB to 64GB)
- Color depth (8, 16, 24, 30, 32, 48)

## Examples

### Example 1: Collect and Validate

```typescript
// Collect fingerprints
const scraper = new FingerprintScraper({ count: 100 });
const fingerprints = await scraper.scrapeRealFingerprints();

// Validate
const validator = new FingerprintValidator();
const results = validator.validateDataset(fingerprints);

// Keep only valid ones
const validFingerprints = fingerprints.filter((_, i) =>
  results.results[i].valid
);

// Save
await scraper.saveFingerprints('./valid-fingerprints.json');
```

### Example 2: Parse and Filter

```typescript
const parser = new FingerprintParser();
parser.loadFromFile('./raw-fingerprints.json');

// Parse and normalize
const parsed = parser.parseAll();

// Remove duplicates
parser.deduplicate();

// Get high-quality fingerprints only
const highQuality = parser.filterByQuality(0.9);
const validOnly = parser.filterValid();

// Save filtered data
parser.saveToFile('./filtered-fingerprints.json');
```

### Example 3: Generate Statistics

```typescript
const parser = new FingerprintParser();
parser.loadFromFile('./fingerprints.json');
parser.parseAll();

const stats = parser.getStats();

console.log(`
Dataset Statistics:
- Total: ${stats.totalFingerprints}
- Valid: ${stats.validFingerprints}
- Average Quality: ${stats.averageQuality.toFixed(3)}

Browsers:
${Object.entries(stats.browsers)
  .map(([name, count]) => `  - ${name}: ${count}`)
  .join('\n')}

Operating Systems:
${Object.entries(stats.os)
  .map(([name, count]) => `  - ${name}: ${count}`)
  .join('\n')}
`);
```

## Testing

Run the test suite:

```bash
# Run all ML tests
npm test -- tests/ml/

# Run specific test
npm test -- tests/ml/scraper.test.ts
npm test -- tests/ml/parser.test.ts
npm test -- tests/ml/validation.test.ts
```

## Performance

### Scraping Performance
- Real browser: ~1-2 seconds per fingerprint
- 1000 fingerprints: ~30-60 minutes
- 10000 fingerprints: ~5-10 hours

### Generation Performance
- Sample generation: ~1000 fingerprints/second
- 10000 fingerprints: ~10 seconds

### Parsing Performance
- ~10000 fingerprints/second
- 100000 fingerprints: ~10 seconds

## Session 10: ML Profile Generation

### Setup

1. Install Python dependencies:

```bash
cd ml
pip install -r requirements.txt
```

2. Verify dataset exists:

```bash
ls -lh datasets/fingerprints.json
# Should show ~6.4MB file with 1000+ fingerprints
```

### Training the Model

Train the model on the collected dataset:

```bash
cd ml/models

# Quick test (10 samples, 5 epochs)
python train.py --data ../datasets/fingerprints.json --max-samples 10 --epochs 5

# Full training (all data, 100 epochs)
python train.py --data ../datasets/fingerprints.json --epochs 100

# With custom settings
python train.py \
  --data ../datasets/fingerprints.json \
  --epochs 100 \
  --batch-size 32 \
  --lr 1e-4 \
  --output fingerprint_generator.pth \
  --device cuda  # Use GPU if available
```

Training will:
- Load the dataset
- Split into train/validation (80/20)
- Train for specified epochs
- Save best model based on validation loss
- Print progress and losses

Expected training time:
- CPU: ~2-4 hours for 1000 samples, 100 epochs
- GPU: ~30-60 minutes for 1000 samples, 100 epochs

### Generating Profiles

#### Method 1: Python Script

```bash
cd ml/models

# Generate profile
python generate.py \
  --model fingerprint_generator.pth \
  --params '{"country":"US","os":"Windows","browser":"Chrome","browserVersion":"120"}' \
  --pretty

# Save to file
python generate.py \
  --model fingerprint_generator.pth \
  --params '{"country":"US","os":"Mac","browser":"Chrome","browserVersion":"120"}' \
  --output profile.json
```

#### Method 2: TypeScript API

```typescript
import { MLProfileGenerator } from './ml/api/generate';

const generator = new MLProfileGenerator();

// Generate profile
const profile = await generator.generate({
  country: 'US',
  os: 'windows',
  browser: 'Chrome',
  browserVersion: '120'
});

console.log('Generated profile:', profile);
```

#### Method 3: Stdin (for integration)

```bash
echo '{"country":"US","os":"Windows","browser":"Chrome"}' | python generate.py
```

### Generated Profile Structure

The model generates:

```typescript
{
  canvas: {
    hash: "a7b3c2d1",
    parameters: { width: 280, height: 60, ... }
  },
  webgl: {
    vendor: "NVIDIA Corporation",
    renderer: "ANGLE (NVIDIA GeForce RTX 3070...)",
    extensions: [...],
    ...
  },
  audio: {
    hash: "e4f5g6h7",
    sampleRate: 48000,
    ...
  },
  hardware: {
    platform: "Win32",
    hardwareConcurrency: 8,
    deviceMemory: 16,
    userAgent: "Mozilla/5.0...",
    ...
  },
  screen: {
    width: 1920,
    height: 1080,
    colorDepth: 24,
    devicePixelRatio: 1,
    ...
  }
}
```

### Consistency Validation

The TypeScript API automatically validates generated profiles:

```typescript
const generator = new MLProfileGenerator();

try {
  const profile = await generator.generate({
    country: 'US',
    os: 'mac',
    browser: 'Chrome'
  });
  // Profile is valid and consistent
} catch (error) {
  // Profile failed consistency checks
  console.error('Validation failed:', error);
}
```

Validation checks:
- Hardware/GPU compatibility (e.g., Mac + NVIDIA = error)
- Screen aspect ratio (must be 1.0-3.5)
- Hardware limits (cores, memory, etc.)
- WebGL renderer compatibility
- Timezone offset validity

### Integration with Anti-Detection Browser

```typescript
import { createMLProfileGenerator } from './ml/api/generate';
import { UndetectBrowser } from './src';

const generator = createMLProfileGenerator();

// Generate profile for target
const profile = await generator.generate({
  country: 'US',
  os: 'windows',
  browser: 'Chrome',
  browserVersion: '120'
});

// Apply to browser
const browser = new UndetectBrowser({
  fingerprint: {
    canvas: profile.canvas,
    webgl: profile.webgl,
    audio: profile.audio,
    hardware: profile.hardware,
    screen: profile.screen
  }
});

await browser.launch();
```

### Model Architecture

The model uses:

1. **Encoder**: Converts input parameters (country, OS, browser) to embeddings
2. **GPT-2 Backbone**: Pre-trained transformer for sequence generation
3. **Decoder**: Custom neural network that decodes latent representation into fingerprint components

```
Input Params → Encoder → GPT-2 → Decoder → Fingerprint Components
                                           ├─ Canvas
                                           ├─ WebGL
                                           ├─ Audio
                                           ├─ Hardware
                                           └─ Screen
```

### Performance

- Model size: ~500MB (GPT-2 + custom layers)
- Inference time: ~100-200ms per profile (CPU)
- Inference time: ~10-20ms per profile (GPU)
- Memory usage: ~2GB (with GPT-2 loaded)

### Troubleshooting

**Issue**: `ModuleNotFoundError: No module named 'transformers'`
```bash
pip install -r requirements.txt
```

**Issue**: `RuntimeError: CUDA out of memory`
```bash
# Use CPU instead
python train.py --device cpu
```

**Issue**: `FileNotFoundError: fingerprint_generator.pth`
```bash
# Train the model first
python train.py --epochs 10
```

**Issue**: Generated profiles are inconsistent
```bash
# Train for more epochs or with more data
python train.py --epochs 200 --max-samples 10000
```

## Session 11: Adaptive Detection System

### Overview

Self-improving anti-detection system that uses Reinforcement Learning to continuously optimize protection settings.

### Components

1. **Detection Monitor** (`detection/monitor.ts`)
   - Tests against 5 major detection sites
   - Weighted scoring system
   - Historical tracking and trends
   - Actionable recommendations

2. **RL Agent** (`detection/rl-agent.py`)
   - PPO (Proximal Policy Optimization)
   - Custom Gym environment
   - 10D action space (protection levels)
   - 5D observation space (detector scores)

3. **Auto-Updater** (`detection/auto-updater.ts`)
   - Automated testing cycles
   - RL-based optimization
   - Smart deployment with thresholds
   - Comprehensive tracking

4. **Dashboard** (`detection/dashboard.ts`)
   - Real-time visualization
   - Historical trends
   - Configuration management
   - REST API

### Quick Start

```typescript
import { DetectionMonitor, createAutoUpdater, createDashboard } from './ml/detection';

// Setup adaptive system
const monitor = new DetectionMonitor();
const updater = createAutoUpdater({
  minImprovement: 5,
  testInterval: 24,
  enableAutoUpdate: true,
});

// Start dashboard
const dashboard = await createDashboard(monitor, updater, { port: 3000 });

// Enable auto-updates
const browserFactory = async () => {
  const browser = new UndetectBrowser({ headless: true });
  return await browser.launch();
};

updater.startAutoUpdate(browserFactory);

// System now runs autonomously!
```

### Training RL Agent

```bash
cd ml/detection

# Train agent
python3 rl-agent.py --timesteps 100000 --episodes 20

# Evaluate
python3 rl-agent.py --eval-only --model anti_detection_agent
```

### Usage

See `ml/detection/README.md` for complete documentation.

## Next Steps

1. ✅ **Dataset Collection** (Session 9)
2. ✅ **ML Model Training** (Session 10)
3. ✅ **Adaptive Detection System** (Session 11)
4. **Production Deployment**: Deploy as full service
5. **Fine-tuning**: Train on larger datasets (10,000+ samples)
6. **Advanced RL**: Implement multi-objective optimization
7. **Cloud Integration**: Deploy to cloud infrastructure

## Files Generated

### Session 9
- `fingerprints.json` - Main dataset (1000 fingerprints, ~6.4MB)
- `stats.json` - Dataset statistics
- `validation-results.json` - Validation results
- `validation-report.md` - Human-readable validation report

### Session 10
- `fingerprint_generator.pth` - Trained ML model (~500MB)
- `profile.json` - Generated profile examples

### Session 11
- `current-config.json` - Active protection configuration
- `update-history.json` - All adaptive cycles
- `detection-history.json` - All detection test results
- `rl_model.zip` - Trained RL model
- `rl_model_best_config.json` - Best configuration found

## License

MIT

## Related Documentation

- [Session 1-8: Anti-Detection Features](../README.md)
- [TECHNICAL_ARCHITECTURE.md](../TECHNICAL_ARCHITECTURE.md)
- [Testing Guide](../TESTING_GUIDE.md)
