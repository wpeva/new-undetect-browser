/**
 * ML Dataset Collection Demo
 * Session 9: Machine Learning Dataset Collection
 *
 * Demo script to collect a small dataset and demonstrate functionality
 */

import * as path from 'path';
import { FingerprintScraper } from './scraper';
import { FingerprintParser } from './parser';
import { FingerprintValidator } from '../datasets/validation';

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 ML FINGERPRINT DATA COLLECTION - DEMO');
  console.log('='.repeat(60));
  console.log();

  // Configuration
  const outputDir = path.join(__dirname, '../datasets');
  const rawDataPath = path.join(outputDir, 'raw-fingerprints.json');
  const parsedDataPath = path.join(outputDir, 'fingerprints.json');
  const statsPath = path.join(outputDir, 'stats.json');
  const validationPath = path.join(outputDir, 'validation-results.json');
  const reportPath = path.join(outputDir, 'validation-report.md');

  // Step 1: Collect fingerprints
  console.log('📊 Step 1: Collecting fingerprints...');
  console.log('Note: Collecting 10 fingerprints for demo (production: 10,000+)');
  console.log();

  const scraper = new FingerprintScraper({
    count: 10,
    headless: true,
    delayBetweenRequests: 500,
  });

  const fingerprints = await scraper.scrapeRealFingerprints(10);
  await scraper.saveFingerprints(rawDataPath);

  console.log();
  console.log('✅ Step 1 complete!');
  console.log();

  // Step 2: Parse and normalize
  console.log('📊 Step 2: Parsing and normalizing data...');
  console.log();

  const parser = new FingerprintParser();
  parser.loadFromArray(fingerprints);
  const parsed = parser.parseAll();

  // Deduplicate
  parser.deduplicate();

  // Get statistics
  const stats = parser.getStats();
  console.log('📈 Dataset Statistics:');
  console.log(`  Total: ${stats.totalFingerprints}`);
  console.log(`  Valid: ${stats.validFingerprints}`);
  console.log(`  Invalid: ${stats.invalidFingerprints}`);
  console.log(`  Average Quality: ${stats.averageQuality.toFixed(3)}`);
  console.log();

  // Save parsed data
  parser.saveToFile(parsedDataPath);
  parser.saveStats(statsPath);

  console.log('✅ Step 2 complete!');
  console.log();

  // Step 3: Validate dataset
  console.log('📊 Step 3: Validating dataset...');
  console.log();

  const validator = new FingerprintValidator();
  const validationResults = validator.validateDataset(fingerprints);

  console.log('📈 Validation Results:');
  console.log(`  Valid: ${validationResults.valid}`);
  console.log(`  Invalid: ${validationResults.invalid}`);
  console.log(`  Warnings: ${validationResults.warnings}`);
  console.log();

  // Save validation results
  validator.saveValidationResults(validationResults.results, validationPath);
  validator.saveReport(validationResults.results, reportPath);

  console.log('✅ Step 3 complete!');
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('✅ DEMO COMPLETE!');
  console.log('='.repeat(60));
  console.log();
  console.log('Generated files:');
  console.log(`  📄 ${rawDataPath}`);
  console.log(`  📄 ${parsedDataPath}`);
  console.log(`  📄 ${statsPath}`);
  console.log(`  📄 ${validationPath}`);
  console.log(`  📄 ${reportPath}`);
  console.log();
  console.log('Next steps:');
  console.log('  1. Run with higher count for production dataset');
  console.log('  2. Train ML model on collected data');
  console.log('  3. Use for fingerprint generation and validation');
  console.log();
}

// Run demo
main().catch(console.error);
