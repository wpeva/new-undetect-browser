/**
 * ML Dataset Collection & Profile Generation Module
 * Session 9: Machine Learning Dataset Collection
 * Session 10: ML Profile Generation
 *
 * Export all components
 */

// Types
export * from './types/fingerprint';

// Data Collection (Session 9)
export { FingerprintScraper } from './data-collection/scraper';
export { FingerprintParser } from './data-collection/parser';
export { SampleDataGenerator } from './data-collection/generator';

// Validation
export { FingerprintValidator } from './datasets/validation';

// Profile Generation (Session 10)
export {
  MLProfileGenerator,
  createMLProfileGenerator,
  type GenerateParams,
  type GeneratedProfile,
  type ValidationResult,
} from './api/generate';
