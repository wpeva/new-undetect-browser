/**
 * ML Dataset Collection & Profile Generation Module
 * Session 9: Machine Learning Dataset Collection
 * Session 10: ML Profile Generation
 * Session 11: Adaptive Detection System
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

// Adaptive Detection System (Session 11)
export {
  DetectionMonitor,
  AutoUpdater,
  AdaptiveDashboard,
  createAutoUpdater,
  createDashboard,
  AdaptiveDetectionSystem,
} from './detection';

export type {
  DetectorConfig,
  DetectionScore,
  DetectionReport,
  ProtectionConfig,
  UpdateResult,
  AutoUpdaterConfig,
  DashboardConfig,
} from './detection';
