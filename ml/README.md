# ML Dataset Collection - Session 9

Machine Learning fingerprint dataset collection module for training and generating realistic browser fingerprints.

## Overview

This module provides tools for collecting, parsing, validating, and managing large-scale browser fingerprint datasets. The collected data can be used for:

- Training ML models for fingerprint generation
- Analyzing fingerprint patterns and distributions
- Testing anti-detection capabilities
- Research on browser fingerprinting

## Features

✅ **Fingerprint Scraper** - Collect real browser fingerprints from various sources
✅ **Data Parser** - Normalize and analyze collected data
✅ **Validation** - Ensure data quality and consistency
✅ **Sample Generator** - Generate realistic sample data without scraping
✅ **1000+ Fingerprints** - Pre-generated dataset included

## Architecture

```
ml/
├── data-collection/
│   ├── scraper.ts      # Browser fingerprint scraper
│   ├── parser.ts       # Data normalization and parsing
│   ├── generator.ts    # Sample data generator
│   └── demo.ts         # Demo script
├── datasets/
│   ├── validation.ts   # Dataset validation
│   └── fingerprints.json  # 1000 sample fingerprints
├── types/
│   └── fingerprint.ts  # TypeScript types
└── scripts/
    └── generate-sample-dataset.js  # Quick dataset generator
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

## Next Steps

1. **Expand Dataset**: Collect 10,000+ real fingerprints
2. **ML Model**: Train model for fingerprint generation
3. **Pattern Analysis**: Analyze distributions and correlations
4. **Integration**: Use for realistic fingerprint spoofing

## Files Generated

- `fingerprints.json` - Main dataset (1000 fingerprints, ~6.4MB)
- `stats.json` - Dataset statistics
- `validation-results.json` - Validation results
- `validation-report.md` - Human-readable validation report

## License

MIT

## Related Documentation

- [Session 1-8: Anti-Detection Features](../README.md)
- [TECHNICAL_ARCHITECTURE.md](../TECHNICAL_ARCHITECTURE.md)
- [Testing Guide](../TESTING_GUIDE.md)
