/**
 * Session 11: Adaptive Detection System
 *
 * Self-improving anti-detection system using Reinforcement Learning
 *
 * @module ml/detection
 */

export {
  DetectionMonitor,
  DetectorConfig,
  DetectionScore,
  DetectionReport,
} from './monitor';

export {
  AutoUpdater,
  ProtectionConfig,
  UpdateResult,
  AutoUpdaterConfig,
  createAutoUpdater,
} from './auto-updater';

export {
  AdaptiveDashboard,
  DashboardConfig,
  createDashboard,
} from './dashboard';

// Re-export everything for convenience
import { DetectionMonitor } from './monitor';
import { AutoUpdater, createAutoUpdater } from './auto-updater';
import { AdaptiveDashboard, createDashboard } from './dashboard';

export const AdaptiveDetectionSystem = {
  DetectionMonitor,
  AutoUpdater,
  AdaptiveDashboard,
  createAutoUpdater,
  createDashboard,
};

export default AdaptiveDetectionSystem;
